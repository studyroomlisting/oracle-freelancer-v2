import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Replacement guarantee: if a team member becomes unavailable, the team
// leader can flag it here. This marks the member REPLACED (removing them
// from the active roster shown to clients) and returns other approved
// freelancers as replacement candidates — loosely matched on Oracle module
// overlap with the outgoing member, sorted by rating. Not a sophisticated
// matching algorithm; a real version would weigh availability, day rate,
// and actual skill taxonomy rather than a substring match on a comma-
// separated field. Good enough to unblock a leader who needs options fast.
async function POSTHandler(req: NextRequest, { params }: { params: { teamId: string; memberId: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { id: params.teamId }, include: { teamLeader: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.teamLeader.userId !== session.sub) {
    return NextResponse.json({ error: "Only the team leader can request a replacement" }, { status: 403 });
  }

  const member = await prisma.teamMember.findUnique({ where: { id: params.memberId }, include: { freelancerProfile: true } });
  if (!member || member.teamId !== params.teamId) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { status: "REPLACED", replacedAt: new Date() },
  });

  const outgoingModules = member.freelancerProfile.oracleModules
    .split(",")
    .map((m: string) => m.trim().toLowerCase())
    .filter(Boolean);

  const existingMemberProfileIds = (await prisma.teamMember.findMany({ where: { teamId: params.teamId }, select: { freelancerProfileId: true } })).map(
    (m: { freelancerProfileId: string }) => m.freelancerProfileId
  );

  const candidates = await prisma.freelancerProfile.findMany({
    where: { id: { notIn: existingMemberProfileIds }, isApprovedToSell: true },
    include: { user: true },
    orderBy: { ratingAvg: "desc" },
    take: 20,
  });

  // Narrow, explicit shape for exactly the fields used below — avoids `any`
  // without depending on Prisma's generated types (which this environment
  // can't produce — see README Phase 22/25 for why). Once `prisma generate`
  // runs for real, this could be replaced with
  // `Prisma.FreelancerProfileGetPayload<{ include: { user: true } }>`.
  type CandidateWithUser = {
    slug: string;
    headline: string;
    ratingAvg: unknown; // Prisma Decimal — normalized via Number() below
    oracleModules: string;
    user: { fullName: string };
  };

  const scored = (candidates as CandidateWithUser[])
    .map((c) => {
      const modules = c.oracleModules.split(",").map((m) => m.trim().toLowerCase());
      const overlap = modules.filter((m) => outgoingModules.includes(m)).length;
      return { candidate: c, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || Number(b.candidate.ratingAvg) - Number(a.candidate.ratingAvg))
    .slice(0, 5)
    .map(({ candidate, overlap }) => ({
      slug: candidate.slug,
      name: candidate.user.fullName,
      headline: candidate.headline,
      ratingAvg: Number(candidate.ratingAvg),
      moduleOverlap: overlap,
    }));

  return NextResponse.json({ replacedRoleLabel: member.roleLabel, candidates: scored });
}

export const POST = withErrorHandling(POSTHandler);
