import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

async function DELETEHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const entry = await prisma.education.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!entry) throw new ApiError("Education entry not found", 404);
  if (entry.freelancerProfile.userId !== session.sub) throw new ApiError("You can only delete your own education entries", 403);

  await prisma.education.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
