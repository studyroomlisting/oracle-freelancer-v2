import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  institution: z.string().min(2).max(200),
  degree: z.string().min(2).max(200),
  fieldOfStudy: z.string().max(200).optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) throw new ApiError("No freelancer profile found", 404);

  const count = await prisma.education.count({ where: { freelancerProfileId: profile.id } });
  // FIXED (final check): no cap existed. 10 is generous for any real
  // education history.
  if (count >= 10) {
    throw new ApiError("You've reached the maximum of 10 education entries. Remove one to add another.", 409);
  }
  const entry = await prisma.education.create({
    data: { freelancerProfileId: profile.id, ...parsed.data, displayOrder: count },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
