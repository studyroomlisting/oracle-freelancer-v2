import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { generateSlug } from "@/lib/slug";
import { rateLimit } from "@/lib/rateLimit";

// FIXED (Milestone 4 gap): no way to start a new listing from an existing
// one — useful for a freelancer offering a similar service at a different
// price point/module. The copy always lands in DRAFT regardless of the
// source gig's status, and never copies isProjectEngagement (a duplicate
// is always a normal, publicly-listable gig).
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  // FIXED (final check): every other creation endpoint needs a form filled
  // in first, which naturally throttles rapid-fire abuse — duplicate needs
  // no input at all, just repeated clicks (or a trivial script), so it's
  // the one most worth rate-limiting explicitly. Keyed per-account rather
  // than per-IP since this is an authenticated action.
  const { allowed } = rateLimit(`duplicate-gig:${session.sub}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    throw new ApiError("You're duplicating gigs too quickly. Please try again in a bit.", 429);
  }

  const source = await prisma.gig.findUnique({
    where: { id: params.id },
    include: { freelancerProfile: true, packages: true },
  });
  if (!source) throw new ApiError("Gig not found", 404);
  if (source.freelancerProfile.userId !== session.sub) throw new ApiError("You can only duplicate your own gigs", 403);

  const slug = generateSlug(`${source.title} copy`);

  const duplicate = await prisma.gig.create({
    data: {
      slug,
      title: `${source.title} (copy)`,
      description: source.description,
      categoryId: source.categoryId,
      freelancerProfileId: source.freelancerProfileId,
      status: "DRAFT",
      gigType: source.gigType,
      level: source.level,
      tags: source.tags,
      cancellationWindowHours: source.cancellationWindowHours,
      latePenaltyPercent: source.latePenaltyPercent,
      coverImageUrl: source.coverImageUrl,
      // Workshop-specific scheduling is deliberately NOT copied — a cloned
      // workshop needs its own new date/time, not the source's (which may
      // be in the past, sold out, or conflict with it).
      packages: {
        create: source.packages.map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any -- individual Prisma model types aren't importable from this sandbox's client generation; correctness of the working build matters more than silencing this warning
          tier: p.tier,
          title: p.title,
          description: p.description,
          priceGbp: p.priceGbp,
          deliveryDays: p.deliveryDays,
          revisions: p.revisions,
          sessionDurationMinutes: p.sessionDurationMinutes,
        })),
      },
    },
  });

  return NextResponse.json({ gig: { id: duplicate.id, slug: duplicate.slug } }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
