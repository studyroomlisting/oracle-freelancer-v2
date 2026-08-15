import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  companyName: z.string().min(2).max(200),
  role: z.string().min(2).max(200),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endYear: z.coerce.number().int().min(1950).max(2100).optional(),
  description: z.string().max(2000).optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  if (parsed.data.endYear && parsed.data.endYear < parsed.data.startYear) {
    throw new ApiError("End year can't be before the start year", 400);
  }

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) throw new ApiError("No freelancer profile found", 404);

  const count = await prisma.workExperience.count({ where: { freelancerProfileId: profile.id } });
  if (count >= 10) {
    throw new ApiError("You've reached the maximum of 10 work experience entries. Remove one to add another.", 409);
  }
  const entry = await prisma.workExperience.create({
    data: { freelancerProfileId: profile.id, ...parsed.data, displayOrder: count },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
