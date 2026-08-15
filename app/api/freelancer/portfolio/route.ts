import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(2000),
  imageUrl: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  projectUrl: z.string().url().optional().or(z.literal("")),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) throw new ApiError("No freelancer profile found", 404);

  const count = await prisma.portfolioItem.count({ where: { freelancerProfileId: profile.id } });
  // FIXED (final check): no cap existed at all — an account could add an
  // unlimited number of items, degrading its own public profile's load
  // time for every visitor. 20 is generously more than any real portfolio
  // needs.
  if (count >= 20) {
    throw new ApiError("You've reached the maximum of 20 portfolio items. Remove one to add another.", 409);
  }
  const item = await prisma.portfolioItem.create({
    data: {
      freelancerProfileId: profile.id,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
      videoUrl: parsed.data.videoUrl || null,
      projectUrl: parsed.data.projectUrl || null,
      displayOrder: count,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
