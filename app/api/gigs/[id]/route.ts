import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireFreelancerSession } from "@/lib/auth";
import { checkWorkshopConflict } from "@/lib/availability";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const packageSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  title: z.string().min(2),
  description: z.string().min(5),
  priceGbp: z.coerce.number().positive(),
  deliveryDays: z.coerce.number().int().positive(),
  revisions: z.coerce.number().int().min(0),
  sessionDurationMinutes: z.coerce.number().int().min(15).optional(),
});

const editSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(30),
  categoryId: z.string().min(1),
  coverImageUrl: z.string().optional(),
  cancellationWindowHours: z.coerce.number().int().positive().optional(),
  latePenaltyPercent: z.coerce.number().int().min(0).max(100).optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  tags: z.string().max(300).optional(),
  packages: z.array(packageSchema).max(3).optional(),
  priceGbp: z.coerce.number().positive().optional(),
  sessionStartAt: z.string().optional(),
  sessionEndAt: z.string().optional(),
  maxSeats: z.coerce.number().int().positive().optional(),
});

async function PATCHHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("You need a freelancer account to edit a gig", 403);

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { freelancerProfile: true, packages: true },
  });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only edit your own gigs", 403);
  if (gig.status === "REJECTED") throw new ApiError("A rejected gig can't be edited — create a new one instead", 409);
  if (gig.status === "ARCHIVED") throw new ApiError("Restore this gig from the archive before editing it", 409);

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  const data = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new ApiError("Selected category does not exist", 400);

  if (gig.gigType === "WORKSHOP") {
    if (!data.sessionStartAt || !data.sessionEndAt || !data.maxSeats || !data.priceGbp) {
      throw new ApiError("Workshop schedule, seats, and price are required", 400);
    }
    const start = new Date(data.sessionStartAt);
    const end = new Date(data.sessionEndAt);
    if (end <= start) throw new ApiError("Workshop end time must be after the start time", 400);

    if (data.maxSeats < gig.seatsBooked) {
      throw new ApiError(`Can't set max seats below the ${gig.seatsBooked} already booked`, 400);
    }

    const timeChanged = start.getTime() !== gig.sessionStartAt?.getTime() || end.getTime() !== gig.sessionEndAt?.getTime();

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (timeChanged) {
        // FIXED (Supabase migration): converted from MySQL's GET_LOCK/
        // RELEASE_LOCK to Postgres's pg_try_advisory_xact_lock —
        // transaction-scoped, so it releases automatically on commit or
        // rollback and no longer needs a manual try/finally at all.
        const lockName = `workshop_schedule_${gig.freelancerProfileId}`;
        const [{ lock_acquired: lockAcquired }] = await tx.$queryRaw<{ lock_acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext(${lockName})::bigint) AS lock_acquired
        `;
        if (!lockAcquired) {
          throw new ApiError("Your schedule is being updated right now — please try again in a moment.", 409);
        }
        const { conflict, reason } = await checkWorkshopConflict(gig.freelancerProfileId, { start, end }, gig.id);
        if (conflict) throw new ApiError(reason ?? "This time conflicts with your existing schedule", 409);
      }

      const g = await tx.gig.update({
        where: { id: gig.id },
        data: {
          title: data.title,
          description: data.description,
          categoryId: data.categoryId,
          coverImageUrl: data.coverImageUrl ?? gig.coverImageUrl,
          level: data.level ?? null,
          tags: data.tags ?? gig.tags,
          cancellationWindowHours: data.cancellationWindowHours ?? null,
          latePenaltyPercent: data.latePenaltyPercent ?? null,
          sessionStartAt: start,
          sessionEndAt: end,
          maxSeats: data.maxSeats,
        },
      });
      if (gig.packages[0]) {
        await tx.gigPackage.update({ where: { id: gig.packages[0].id }, data: { priceGbp: data.priceGbp! } });
      }
      return g;
    });
    return NextResponse.json({ gig: updated });
  }

  if (!data.packages || data.packages.length === 0) throw new ApiError("At least one package is required", 400);

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const g = await tx.gig.update({
      where: { id: gig.id },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        coverImageUrl: data.coverImageUrl ?? gig.coverImageUrl,
        level: data.level ?? null,
        tags: data.tags ?? gig.tags,
        cancellationWindowHours: data.cancellationWindowHours ?? null,
        latePenaltyPercent: data.latePenaltyPercent ?? null,
      },
    });
    for (const p of data.packages!) {
      const existing = gig.packages.find((existingPkg: { tier: string; id: string }) => existingPkg.tier === p.tier);
      if (existing) {
        await tx.gigPackage.update({
          where: { id: existing.id },
          data: {
            title: p.title,
            description: p.description,
            priceGbp: p.priceGbp,
            deliveryDays: p.deliveryDays,
            revisions: p.revisions,
            sessionDurationMinutes: gig.gigType === "TRAINING" ? p.sessionDurationMinutes ?? 60 : null,
          },
        });
      } else {
        await tx.gigPackage.create({
          data: {
            gigId: gig.id,
            tier: p.tier,
            title: p.title,
            description: p.description,
            priceGbp: p.priceGbp,
            deliveryDays: p.deliveryDays,
            revisions: p.revisions,
            sessionDurationMinutes: gig.gigType === "TRAINING" ? p.sessionDurationMinutes ?? 60 : null,
          },
        });
      }
    }
    return g;
  });

  return NextResponse.json({ gig: updated });
}

export const PATCH = withErrorHandling(PATCHHandler);

// FIXED (Milestone 4 gap): no delete route existed at all. Only allowed
// when zero orders reference this gig — otherwise deleting it would
// orphan real order/milestone/review history. A gig with any order
// history should be archived instead (see /archive), which is reversible
// and doesn't destroy anything.
async function DELETEHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { freelancerProfile: true, _count: { select: { orders: true } } },
  });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only delete your own gigs", 403);
  if (gig._count.orders > 0) {
    throw new ApiError("This gig has order history and can't be deleted — archive it instead.", 409);
  }

  await prisma.gig.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
