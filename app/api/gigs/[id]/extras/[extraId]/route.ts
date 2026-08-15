import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

async function DELETEHandler(req: NextRequest, { params }: { params: { id: string; extraId: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const extra = await prisma.gigExtra.findUnique({ where: { id: params.extraId }, include: { gig: { include: { freelancerProfile: true } } } });
  if (!extra || extra.gigId !== params.id) throw new ApiError("Extra not found", 404);
  if (extra.gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);

  await prisma.gigExtra.delete({ where: { id: params.extraId } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
