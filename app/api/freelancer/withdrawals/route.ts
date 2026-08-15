import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { getWalletSummary, calculateAvailableBalance, validateWithdrawalAmount, InsufficientBalanceError } from "@/lib/wallet";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ amountGbp: z.coerce.number().positive() });

// FIXED (Milestone 12 gap): no way for a freelancer to withdraw their
// earned balance existed at all. Simulated as instantly completing —
// consistent with every other payment event on this platform, and honest
// about it (no real bank transfer integration exists yet).
async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub }, include: { user: true } });
  if (!profile) throw new ApiError("No freelancer profile found", 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("A valid withdrawal amount is required", 400);

  // FIXED (final check, real bug): the balance check previously happened
  // BEFORE the transaction opened — the exact same TOCTOU race condition
  // class already fixed twice before in this codebase (booking, Phase 26;
  // workshop-edit scheduling, Phase 41). Two concurrent withdrawal
  // requests could both read the same available balance, both pass
  // validation against that now-stale read, and both proceed — a genuine
  // double-spend. Fixed with a real lock, scoped per freelancer so
  // concurrent withdrawals by the SAME person serialize without blocking
  // anyone else's.
  //
  // FIXED (Supabase migration): converted from MySQL's GET_LOCK/
  // RELEASE_LOCK to Postgres's pg_try_advisory_xact_lock. Genuinely
  // simpler on Postgres — a `_xact_` advisory lock is automatically
  // released when the transaction ends (commit OR rollback), so the
  // manual RELEASE_LOCK call and the try/finally wrapper it required are
  // both gone; there's no way to leak this lock. Postgres advisory locks
  // take a numeric key, not an arbitrary string — hashtext() converts the
  // same lock-name string MySQL used into one.
  const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const lockName = `withdrawal_${profile.id}`;
    const [{ lock_acquired: lockAcquired }] = await tx.$queryRaw<{ lock_acquired: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtext(${lockName})::bigint) AS lock_acquired
    `;
    if (!lockAcquired) {
      throw new ApiError("Another withdrawal is already being processed — please try again in a moment.", 409);
    }

    const totals = await getWalletSummary(session.sub);
    const available = calculateAvailableBalance(totals);
    try {
      validateWithdrawalAmount(parsed.data.amountGbp, available);
    } catch (err) {
      if (err instanceof InsufficientBalanceError) throw new ApiError(err.message, 400);
      throw err;
    }

    const w = await tx.withdrawal.create({
      data: {
        freelancerProfileId: profile.id,
        amountGbp: parsed.data.amountGbp,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    await tx.transaction.create({
      data: {
        userId: session.sub,
        type: "WITHDRAWAL",
        status: "SUCCEEDED",
        amountGbp: parsed.data.amountGbp,
        reference: `withdrawal_${w.id.slice(-8)}`,
      },
    });
    return w;
  });

  await sendEmail({
    to: profile.user.email,
    subject: "Withdrawal completed",
    body: `Your withdrawal of £${parsed.data.amountGbp.toFixed(2)} has been processed.`,
  });
  await createNotification({
    userId: session.sub,
    type: "wallet",
    title: "Withdrawal completed",
    body: `£${parsed.data.amountGbp.toFixed(2)} has been withdrawn.`,
    linkUrl: "/dashboard/payments",
  });

  return NextResponse.json({ withdrawal }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
