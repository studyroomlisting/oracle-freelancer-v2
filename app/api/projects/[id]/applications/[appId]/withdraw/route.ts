import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string; appId: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const application = await prisma.projectApplication.findUnique({
    where: { id: params.appId },
    include: { freelancerProfile: true, team: true },
  });
  if (!application || application.projectPostingId !== params.id) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const isOwnIndividualApp = application.freelancerProfile?.userId === session.sub;
  const isOwnTeamApp = application.team?.teamLeaderId
    ? (await prisma.freelancerProfile.findUnique({ where: { id: application.team.teamLeaderId } }))?.userId === session.sub
    : false;

  if (!isOwnIndividualApp && !isOwnTeamApp) {
    return NextResponse.json({ error: "You can only withdraw your own (or your team's) application" }, { status: 403 });
  }
  if (application.status !== "PENDING") {
    return NextResponse.json({ error: "Only a pending application can be withdrawn" }, { status: 409 });
  }

  const updated = await prisma.projectApplication.update({
    where: { id: application.id },
    data: { status: "WITHDRAWN" },
  });

  return NextResponse.json({ application: updated });
}

export const POST = withErrorHandling(POSTHandler);
