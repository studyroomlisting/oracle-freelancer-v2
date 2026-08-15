import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  resolution: z.enum(["REFUND", "RELEASE", "DISMISS"]),
  refundAmountGbp: z.coerce.number().positive().optional(),
  notes: z.string().min(5).max(2000),
});

// FIXED (Milestone 11 gap): no admin dispute-resolution workflow existed
// at all. Three outcomes, covering "Test Full Refund", "Test Partial
// Refund", and "Test Resolution" in one coherent mechanism:
//  - REFUND: logs a real ledger entry. Full amount if none specified;
//    a partial amount cancels the order only if it equals the full
//    total — a partial refund is a goodwill credit while work continues,
//    not a cancellation, so the order returns to whatever real status it
//    was in before the dispute (see statusBeforeDispute — FIXED, real
//    gap found during review: this used to always hardcode IN_PROGRESS,
//    silently discarding DELIVERED/IN_REVISION progress).
//  - RELEASE: sides with the freelancer — approves any outstanding
//    milestones (logging their payouts, same as the normal approval
//    route) and completes the order.
//  - DISMISS: no financial event, order returns to whatever real status
//    it was in before the dispute, same reasoning as REFUND above.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true, milestones: true },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.status !== "DISPUTED") throw new ApiError("This order isn't currently disputed", 409);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  const { resolution, notes } = parsed.data;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (resolution === "REFUND") {
      const refundAmount = parsed.data.refundAmountGbp ?? Number(order.totalPriceGbp);
      if (refundAmount > Number(order.totalPriceGbp)) {
        throw new ApiError("Refund amount can't exceed the order total", 400);
      }
      await tx.transaction.create({
        data: {
          orderId: order.id,
          userId: order.clientId,
          type: "REFUND",
          status: "SUCCEEDED",
          amountGbp: refundAmount,
          reference: `dispute_refund_${order.id.slice(-8)}`,
        },
      });
      const isFullRefund = refundAmount >= Number(order.totalPriceGbp);
      // FIXED (real gap found during review): a dispute raised on
      // already-DELIVERED work, resolved with a partial refund, used to
      // always hardcode the order back to IN_PROGRESS — silently
      // discarding the fact that work had genuinely been delivered.
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? "CANCELLED" : (order.statusBeforeDispute ?? "IN_PROGRESS"),
          disputeResolutionNotes: notes,
        },
      });
    } else if (resolution === "RELEASE") {
      const outstanding = order.milestones.filter((m: { id: string; status: string; amountGbp: any }) => m.status !== "APPROVED"); // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma.Decimal isn't a valid exported type from this client generation; correctness of the working build matters more than silencing this one warning
      for (const m of outstanding) {
        await tx.milestone.update({ where: { id: m.id }, data: { status: "APPROVED", approvedAt: new Date() } });
        await tx.transaction.create({
          data: {
            orderId: order.id,
            userId: order.gig.freelancerProfile.userId,
            type: "PAYOUT",
            status: "SUCCEEDED",
            amountGbp: m.amountGbp,
            reference: `dispute_payout_${m.id.slice(-8)}`,
          },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED", disputeResolutionNotes: notes } });
    } else {
      await tx.order.update({ where: { id: order.id }, data: { status: order.statusBeforeDispute ?? "IN_PROGRESS", disputeResolutionNotes: notes } });
    }
  });

  const resolutionLabel = resolution === "REFUND" ? "refunded" : resolution === "RELEASE" ? "released to the freelancer" : "dismissed, work continues";
  await createAuditLog({ adminUserId: session.sub, action: "dispute.resolve", targetType: "Order", targetId: order.id, details: `${resolution}: ${notes}` });
  await Promise.all([
    sendEmail({ to: order.client.email, subject: `Dispute resolved: ${order.gig.title}`, body: `An admin has reviewed your dispute — outcome: ${resolutionLabel}.\n\n${notes}` }),
    sendEmail({ to: order.gig.freelancerProfile.user.email, subject: `Dispute resolved: ${order.gig.title}`, body: `An admin has reviewed the dispute on this order — outcome: ${resolutionLabel}.\n\n${notes}` }),
    createNotification({ userId: order.clientId, type: "dispute", title: "Dispute resolved", body: `Outcome: ${resolutionLabel}.`, linkUrl: `/orders/${order.id}` }),
    createNotification({ userId: order.gig.freelancerProfile.userId, type: "dispute", title: "Dispute resolved", body: `Outcome: ${resolutionLabel}.`, linkUrl: `/orders/${order.id}` }),
  ]);

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
