import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { checkWorkshopConflict } from "@/lib/availability";
import { generateSlug } from "@/lib/slug";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const packageSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  title: z.string().min(2),
  description: z.string().min(5),
  priceGbp: z.coerce.number().positive(),
  deliveryDays: z.coerce.number().int().positive(),
  revisions: z.coerce.number().int().min(0),
  sessionDurationMinutes: z.coerce.number().int().min(15).optional(),
});

const baseSchema = z.object({
  title: z.string().min(10, "Title should be at least 10 characters — describe the outcome, e.g. 'I will configure...'"),
  description: z.string().min(30, "Add a bit more detail so clients know what's included."),
  categoryId: z.string().min(1),
  cancellationWindowHours: z.coerce.number().int().positive().optional(),
  latePenaltyPercent: z.coerce.number().int().min(0).max(100).optional(),
  coverImageUrl: z.string().optional(),
  tags: z.string().max(300).optional(),
  // FIXED (Milestone 4 gap): every new gig previously landed straight in
  // PENDING_REVIEW — DRAFT existed in the schema but nothing ever set it.
  // A freelancer can now save a draft to keep working on it before
  // submitting for admin review.
  saveAsDraft: z.boolean().optional(),
});

const consultingOrTrainingSchema = baseSchema.extend({
  gigType: z.enum(["CONSULTING", "TRAINING"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  packages: z.array(packageSchema).min(1).max(3),
});

const workshopSchema = baseSchema.extend({
  gigType: z.literal("WORKSHOP"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  priceGbp: z.coerce.number().positive(),
  sessionStartAt: z.string().min(1),
  sessionEndAt: z.string().min(1),
  maxSeats: z.coerce.number().int().positive(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) {
    return NextResponse.json({ error: "You need a freelancer account to create a gig" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const schema = body.gigType === "WORKSHOP" ? workshopSchema : consultingOrTrainingSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const freelancerProfile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!freelancerProfile) {
    return NextResponse.json({ error: "No freelancer profile found for this account" }, { status: 404 });
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 });
  }

  const slug = generateSlug(data.title);
  const initialStatus = data.saveAsDraft ? "DRAFT" : "PENDING_REVIEW";

  if (data.gigType === "WORKSHOP") {
    const start = new Date((data as any).sessionStartAt);
    const end = new Date((data as any).sessionEndAt);
    if (end <= start) {
      return NextResponse.json({ error: "Workshop end time must be after the start time" }, { status: 400 });
    }

    const { conflict, reason } = await checkWorkshopConflict(freelancerProfile.id, { start, end });
    if (conflict) {
      return NextResponse.json({ error: reason ?? "This time conflicts with your existing schedule" }, { status: 409 });
    }

    const gig = await prisma.gig.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        freelancerProfileId: freelancerProfile.id,
        status: initialStatus,
        gigType: "WORKSHOP",
        level: (data as any).level ?? null,
        cancellationWindowHours: data.cancellationWindowHours ?? null,
        latePenaltyPercent: data.latePenaltyPercent ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        tags: data.tags ?? null,
        sessionStartAt: new Date((data as any).sessionStartAt),
        sessionEndAt: new Date((data as any).sessionEndAt),
        maxSeats: (data as any).maxSeats,
        seatsBooked: 0,
        packages: {
          create: [
            {
              tier: "BASIC",
              title: "Seat",
              description: "Single seat at this workshop.",
              priceGbp: (data as any).priceGbp,
              deliveryDays: 0,
              revisions: 0,
            },
          ],
        },
      },
    });
    return NextResponse.json({ gig }, { status: 201 });
  }

  const gig = await prisma.gig.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      freelancerProfileId: freelancerProfile.id,
      status: initialStatus,
      gigType: (data as any).gigType,
      level: (data as any).level ?? null,
      cancellationWindowHours: data.cancellationWindowHours ?? null,
      latePenaltyPercent: data.latePenaltyPercent ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      tags: data.tags ?? null,
      packages: {
        create: (data as any).packages.map((p: any) => ({
          tier: p.tier,
          title: p.title,
          description: p.description,
          priceGbp: p.priceGbp,
          deliveryDays: p.deliveryDays,
          revisions: p.revisions,
          sessionDurationMinutes: (data as any).gigType === "TRAINING" ? p.sessionDurationMinutes ?? 60 : null,
        })),
      },
    },
  });

  return NextResponse.json({ gig }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
