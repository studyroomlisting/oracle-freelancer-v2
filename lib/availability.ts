import { prisma } from "@/lib/prisma";

export type Interval = { start: Date; end: Date };

// Core overlap check — half-open intervals, so back-to-back slots (one ends
// exactly when the next starts) do NOT count as a conflict.
export function hasConflict(existing: Interval[], candidate: Interval): boolean {
  return existing.some((slot) => candidate.start < slot.end && candidate.end > slot.start);
}

// Checks a proposed workshop's [start, end) against:
// 1. This freelancer's other ACTIVE/PENDING_REVIEW workshop gigs (can't run two workshops at once)
// 2. Explicit availability exceptions marked unavailable (holidays, external bookings)
//
// Deliberately does NOT check the recurring weekly TrainerAvailability rules
// against workshops — weekly availability describes general working hours
// for 1:1 booking-style gigs, whereas a workshop is a single scheduled event
// the freelancer is explicitly creating; if they schedule it outside their
// usual hours that's their call, but the hard blockers (other bookings,
// explicit exceptions) still apply.
export async function checkWorkshopConflict(
  freelancerProfileId: string,
  candidate: Interval,
  excludeGigId?: string
): Promise<{ conflict: boolean; reason?: string }> {
  const otherWorkshops = await prisma.gig.findMany({
    where: {
      freelancerProfileId,
      gigType: "WORKSHOP",
      status: { in: ["ACTIVE", "PENDING_REVIEW"] },
      ...(excludeGigId ? { id: { not: excludeGigId } } : {}),
      sessionStartAt: { not: null },
      sessionEndAt: { not: null },
    },
    select: { sessionStartAt: true, sessionEndAt: true, title: true },
  });

  const workshopSlots: Interval[] = otherWorkshops
    .filter((g: any) => g.sessionStartAt && g.sessionEndAt)
    .map((g: any) => ({ start: g.sessionStartAt as Date, end: g.sessionEndAt as Date }));

  if (hasConflict(workshopSlots, candidate)) {
    return { conflict: true, reason: "This overlaps with another workshop you already have scheduled." };
  }

  const dateOnly = new Date(Date.UTC(candidate.start.getUTCFullYear(), candidate.start.getUTCMonth(), candidate.start.getUTCDate()));
  const exceptions = await prisma.trainerAvailabilityException.findMany({
    where: { freelancerProfileId, date: dateOnly, isAvailable: false },
  });

  for (const ex of exceptions) {
    // Null start/end on an unavailable exception means the whole day is blocked.
    if (ex.startMinuteUtc == null || ex.endMinuteUtc == null) {
      return { conflict: true, reason: ex.note ?? "You've marked this date as unavailable." };
    }
    const dayStart = dateOnly.getTime();
    const exStart = new Date(dayStart + ex.startMinuteUtc * 60_000);
    const exEnd = new Date(dayStart + ex.endMinuteUtc * 60_000);
    if (hasConflict([{ start: exStart, end: exEnd }], candidate)) {
      return { conflict: true, reason: ex.note ?? "You've marked part of this date as unavailable." };
    }
  }

  return { conflict: false };
}

// Checks a proposed 1:1 training session time against:
// 1. The freelancer's recurring weekly TrainerAvailability (must fall inside a working slot)
// 2. Explicit unavailable exceptions (holidays, one-off blocks)
// 3. Their other scheduled Orders that already have a time booked (no double-booking)
//
// Unlike checkWorkshopConflict, this DOES enforce the weekly rules — a 1:1
// session booked by a client should respect the hours the trainer actually
// published, whereas a workshop is a single event the trainer explicitly
// chose to schedule themselves.
export async function checkTrainingSessionConflict(
  freelancerProfileId: string,
  candidate: Interval
): Promise<{ conflict: boolean; reason?: string }> {
  const dayOfWeek = candidate.start.getUTCDay();
  const startMinute = candidate.start.getUTCHours() * 60 + candidate.start.getUTCMinutes();
  const endMinute = startMinute + Math.round((candidate.end.getTime() - candidate.start.getTime()) / 60_000);

  const weeklyRules = await prisma.trainerAvailability.findMany({ where: { freelancerProfileId, dayOfWeek } });

  if (weeklyRules.length === 0) {
    return { conflict: true, reason: "This trainer hasn't set any availability for this day of the week yet." };
  }

  const fitsAWorkingSlot = weeklyRules.some((r: any) => startMinute >= r.startMinuteUtc && endMinute <= r.endMinuteUtc);
  if (!fitsAWorkingSlot) {
    return { conflict: true, reason: "This time falls outside the trainer's published working hours." };
  }

  const dateOnly = new Date(Date.UTC(candidate.start.getUTCFullYear(), candidate.start.getUTCMonth(), candidate.start.getUTCDate()));
  const exceptions = await prisma.trainerAvailabilityException.findMany({
    where: { freelancerProfileId, date: dateOnly, isAvailable: false },
  });
  for (const ex of exceptions) {
    if (ex.startMinuteUtc == null || ex.endMinuteUtc == null) {
      return { conflict: true, reason: ex.note ?? "The trainer has marked this date as unavailable." };
    }
    if (startMinute < ex.endMinuteUtc && endMinute > ex.startMinuteUtc) {
      return { conflict: true, reason: ex.note ?? "The trainer has blocked part of this date." };
    }
  }

  const dayStart = new Date(dateOnly);
  const dayEnd = new Date(dateOnly);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const existingOrders = await prisma.order.findMany({
    where: {
      gig: { freelancerProfileId },
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { scheduledAt: true, scheduledEndAt: true },
  });
  const bookedSlots: Interval[] = existingOrders
    .filter((o: any) => o.scheduledAt && o.scheduledEndAt)
    .map((o: any) => ({ start: o.scheduledAt as Date, end: o.scheduledEndAt as Date }));
  if (hasConflict(bookedSlots, candidate)) {
    return { conflict: true, reason: "The trainer already has a session booked at this time." };
  }

  return { conflict: false };
}

// Generates real bookable start times for a given calendar date + session
// length, in 30-minute increments, respecting weekly rules, exceptions, and
// already-booked orders. This is what powers the "pick a real slot" UI
// instead of a freeform datetime input the client has to guess at.
export async function getAvailableSlots(
  freelancerProfileId: string,
  dateOnly: Date, // UTC midnight for the target date
  durationMinutes: number
): Promise<{ startMinuteUtc: number }[]> {
  const dayOfWeek = dateOnly.getUTCDay();

  const [weeklyRules, exceptions, existingOrders] = await Promise.all([
    prisma.trainerAvailability.findMany({ where: { freelancerProfileId, dayOfWeek } }),
    prisma.trainerAvailabilityException.findMany({ where: { freelancerProfileId, date: dateOnly } }),
    prisma.order.findMany({
      where: {
        gig: { freelancerProfileId },
        scheduledAt: { gte: dateOnly, lt: new Date(dateOnly.getTime() + 24 * 3600_000) },
        status: { notIn: ["CANCELLED"] },
      },
      select: { scheduledAt: true, scheduledEndAt: true },
    }),
  ]);

  const fullDayBlocked = exceptions.some((e: any) => !e.isAvailable && e.startMinuteUtc == null);
  if (fullDayBlocked || weeklyRules.length === 0) return [];

  const blockedRanges = exceptions
    .filter((e: any) => !e.isAvailable && e.startMinuteUtc != null && e.endMinuteUtc != null)
    .map((e: any) => ({ start: e.startMinuteUtc as number, end: e.endMinuteUtc as number }));

  const bookedRanges = existingOrders
    .filter((o: any) => o.scheduledAt && o.scheduledEndAt)
    .map((o: any) => {
      const start = o.scheduledAt as Date;
      const end = o.scheduledEndAt as Date;
      return { start: start.getUTCHours() * 60 + start.getUTCMinutes(), end: end.getUTCHours() * 60 + end.getUTCMinutes() };
    });

  const slots: { startMinuteUtc: number }[] = [];
  for (const rule of weeklyRules) {
    for (let start = rule.startMinuteUtc; start + durationMinutes <= rule.endMinuteUtc; start += 30) {
      const end = start + durationMinutes;
      const blocked = [...blockedRanges, ...bookedRanges].some((r) => start < r.end && end > r.start);
      if (!blocked) slots.push({ startMinuteUtc: start });
    }
  }
  return slots;
}
