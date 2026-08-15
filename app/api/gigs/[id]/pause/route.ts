import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

// FIXED (feature gap): GigStatus.PAUSED existed in the schema; nothing ever
// set it. A freelancer had no way to temporarily hide a gig from public
// search without losing it entirely — this is that missing "hide" toggle.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const gig = await prisma.gig.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);
  if (gig.status !== "ACTIVE") throw new ApiError("Only an active gig can be hidden", 409);

  const updated = await prisma.gig.update({ where: { id: gig.id }, data: { status: "PAUSED" } });
  return NextResponse.json({ gig: { id: updated.id, status: updated.status } });
}

export const POST = withErrorHandling(POSTHandler);
