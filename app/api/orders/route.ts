import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { checkTrainingSessionConflict } from "@/lib/availability";
import { calculatePlatformFee, calculateClientServiceFee } from "@/lib/pricing";
import { canBookSeats, seatsRemaining } from "@/lib/businessRules";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { SeatUnavailableError, ScheduleConflictError } from "@/lib/api/errors";

// Fallback session length if a training package somehow has no
// sessionDurationMinutes set (shouldn't happen for gigs created after this
// field was added, but old/seeded data might predate it).
const DEFAULT_TRAINING_SESSION_MINUTES = 60;

const schema = z.object({
  gigPackageId: z.string().min(1),
  seats: z.coerce.number().int().positive().optional(),
  scheduledAt: z.string().min(1).optional(), // required for TRAINING gigs
  extraIds: z.array(z.string()).max(10).optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) {
    return NextResponse.json({ error: "You need to be signed in to place an order" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order request" }, { status: 400 });
  }
  const { gigPackageId, seats, scheduledAt, extraIds } = parsed.data;

  const gigPackage = await prisma.gigPackage.findUnique({
    where: { id: gigPackageId },
    include: { gig: true },
  });
  if (!gigPackage || gigPackage.gig.status !== "ACTIVE") {
    return NextResponse.json({ error: "This gig is not available" }, { status: 404 });
  }

  const isWorkshop = gigPackage.gig.gigType === "WORKSHOP";
  const isTraining = gigPackage.gig.gigType === "TRAINING";
  const seatCount = isWorkshop ? seats ?? 1 : 1;

  // FIXED (real gap found during review): gig extras (paid add-ons) didn't
  // exist at all. Security-relevant validation here: every requested
  // extra ID must belong to the SAME gig as the package being ordered —
  // without this check, a client could pass an extra ID scraped from a
  // different, possibly much more expensive gig and get it silently
  // included at whatever price that unrelated gig set.
  let extras: { id: string; title: string; priceGbp: any }[] = [];
  if (extraIds && extraIds.length > 0) {
    extras = await prisma.gigExtra.findMany({ where: { id: { in: extraIds }, gigId: gigPackage.gigId } });
    if (extras.length !== extraIds.length) {
      return NextResponse.json({ error: "One or more selected extras are no longer available for this gig" }, { status: 400 });
    }
  }
  const extrasTotal = extras.reduce((sum, e) => sum + Number(e.priceGbp), 0);

  // FIXED (production review, Critical — race condition): this early check
  // is now a fast-fail UX nicety only ("don't even open a transaction if
  // it's obviously sold out"). It is NOT what prevents overbooking — that
  // enforcement now happens atomically inside the transaction below via a
  // conditional updateMany. Without that, two concurrent requests could
  // both read the same pre-increment seatsBooked here, both pass this
  // check, and both succeed — overselling the last seat.
  if (isWorkshop) {
    const maxSeats = gigPackage.gig.maxSeats ?? 0;
    if (!canBookSeats(maxSeats, gigPackage.gig.seatsBooked, seatCount)) {
      return NextResponse.json({ error: `Only ${seatsRemaining(maxSeats, gigPackage.gig.seatsBooked)} seat(s) left` }, { status: 409 });
    }
  }

  let sessionStart: Date | null = null;
  let sessionEnd: Date | null = null;
  if (isTraining) {
    if (!scheduledAt) {
      return NextResponse.json({ error: "Please choose a session time for this training gig" }, { status: 400 });
    }
    sessionStart = new Date(scheduledAt);
    if (Number.isNaN(sessionStart.getTime())) {
      return NextResponse.json({ error: "Invalid session time" }, { status: 400 });
    }
    const sessionMinutes = gigPackage.sessionDurationMinutes ?? DEFAULT_TRAINING_SESSION_MINUTES;
    sessionEnd = new Date(sessionStart.getTime() + sessionMinutes * 60_000);

    // Same fast-fail-only caveat as the seat check above — the real guard
    // against double-booking is the re-check-under-lock inside the
    // transaction below.
    const { conflict, reason } = await checkTrainingSessionConflict(gigPackage.gig.freelancerProfileId, {
      start: sessionStart,
      end: sessionEnd,
    });
    if (conflict) {
      return NextResponse.json({ error: reason ?? "This time isn't available" }, { status: 409 });
    }
  }

  const totalPriceGbp = Number(gigPackage.priceGbp) * seatCount + extrasTotal;
  const platformFeeGbp = calculatePlatformFee(totalPriceGbp);
  const clientServiceFeeGbp = calculateClientServiceFee(totalPriceGbp);
  const milestoneTitle = isWorkshop ? "Workshop seat confirmation" : isTraining ? "Training session delivery" : "Full delivery";
  const extrasSnapshot = extras.map((e) => ({ title: e.title, priceGbp: Number(e.priceGbp) }));

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // ATOMIC SEAT RESERVATION: a conditional updateMany that only succeeds
    // if there's still enough room, checked and incremented in one
    // database round-trip. If two requests race for the last seat, the
    // database guarantees only one `where` clause matches at increment
    // time — the loser gets affected count 0 and we abort the whole
    // transaction. This is the actual fix for the seat-overbooking race
    // found in the production review; the earlier check above is UX only.
    if (isWorkshop) {
      const maxSeats = gigPackage.gig.maxSeats ?? 0;
      const reserveResult = await tx.gig.updateMany({
        where: { id: gigPackage.gigId, seatsBooked: { lte: maxSeats - seatCount } },
        data: { seatsBooked: { increment: seatCount } },
      });
      if (reserveResult.count === 0) {
        throw new SeatUnavailableError("Someone just booked the last seat(s) — please refresh and try again.");
      }
    }

    // ATOMIC SCHEDULE GUARD: Postgres genuinely does support exclusion
    // constraints (EXCLUDE USING gist) that could close a training-session
    // double-booking race at the schema level — but that needs a
    // range-typed column with a GiST index, a real schema change, not
    // just a query change. The lock-based approach below predates the
    // Supabase/Postgres migration (it was originally written when this
    // ran on MySQL, which has no equivalent constraint at all) and still
    // works correctly on Postgres, so it was kept rather than migrated to
    // an exclusion constraint purely for its own sake — take a
    // session-scoped named lock keyed on the freelancer for the duration
    // of the re-check + create, so two concurrent requests for the same
    // freelancer are forced to serialize here — the second one re-checks
    // for conflicts only after the first has either committed or rolled
    // back its own booking.
    if (isTraining && sessionStart && sessionEnd) {
      // FIXED (Supabase migration): converted from MySQL's GET_LOCK/
      // RELEASE_LOCK to Postgres's pg_try_advisory_xact_lock —
      // transaction-scoped, auto-releases on commit or rollback, no
      // manual try/finally needed.
      const lockName = `training_booking_${gigPackage.gig.freelancerProfileId}`;
      const [{ lock_acquired: lockAcquired }] = await tx.$queryRaw<{ lock_acquired: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext(${lockName})::bigint) AS lock_acquired
      `;
      if (!lockAcquired) {
        throw new ScheduleConflictError("This trainer's schedule is being updated right now — please try again in a moment.");
      }
      const { conflict, reason } = await checkTrainingSessionConflict(gigPackage.gig.freelancerProfileId, {
        start: sessionStart,
        end: sessionEnd,
      });
      if (conflict) {
        throw new ScheduleConflictError(reason);
      }
    }

    return tx.order.create({
      data: {
        gigId: gigPackage.gigId,
        gigPackageId: gigPackage.id,
        clientId: session.sub,
        status: "PENDING_PAYMENT",
        totalPriceGbp,
        platformFeeGbp,
        clientServiceFeeGbp,
        scheduledAt: sessionStart,
        scheduledEndAt: sessionEnd,
        extrasSnapshot: extrasSnapshot.length > 0 ? extrasSnapshot : undefined,
        milestones: { create: [{ title: milestoneTitle, amountGbp: totalPriceGbp - platformFeeGbp }] },
      },
    });
  });

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
