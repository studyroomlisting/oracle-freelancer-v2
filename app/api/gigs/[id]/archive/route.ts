import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

// Reachable from DRAFT, PAUSED, or REJECTED — not directly from ACTIVE, so
// a live gig can't be archived by accident (it must be hidden/paused
// first, a deliberate two-step for anything currently visible to clients).
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const gig = await prisma.gig.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);
  if (!["DRAFT", "PAUSED", "REJECTED"].includes(gig.status)) {
    throw new ApiError("Hide (pause) an active gig before archiving it", 409);
  }

  const updated = await prisma.gig.update({ where: { id: gig.id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ gig: { id: updated.id, status: updated.status } });
}

export const POST = withErrorHandling(POSTHandler);
