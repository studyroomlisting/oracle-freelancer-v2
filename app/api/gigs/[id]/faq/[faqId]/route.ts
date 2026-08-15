import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

async function DELETEHandler(req: NextRequest, { params }: { params: { id: string; faqId: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const item = await prisma.gigFaqItem.findUnique({ where: { id: params.faqId }, include: { gig: { include: { freelancerProfile: true } } } });
  if (!item || item.gigId !== params.id) throw new ApiError("FAQ item not found", 404);
  if (item.gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);

  await prisma.gigFaqItem.delete({ where: { id: params.faqId } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
