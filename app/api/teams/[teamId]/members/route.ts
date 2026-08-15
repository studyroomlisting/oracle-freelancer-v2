import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  freelancerSlug: z.string().min(1),
  roleLabel: z.string().min(2),
});

async function POSTHandler(req: NextRequest, { params }: { params: { teamId: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { id: params.teamId }, include: { teamLeader: true, members: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.teamLeader.userId !== session.sub) {
    return NextResponse.json({ error: "Only the team leader can add members" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid member details" }, { status: 400 });

  const candidate = await prisma.freelancerProfile.findUnique({ where: { slug: parsed.data.freelancerSlug }, include: { user: true } });
  if (!candidate) return NextResponse.json({ error: "No freelancer found with that slug" }, { status: 404 });

  const alreadyActive = team.members.some((m: { freelancerProfileId: string; status: string }) => m.freelancerProfileId === candidate.id && m.status === "ACTIVE");
  if (alreadyActive) return NextResponse.json({ error: "This freelancer is already an active member" }, { status: 409 });

  const member = await prisma.teamMember.upsert({
    where: { teamId_freelancerProfileId: { teamId: team.id, freelancerProfileId: candidate.id } },
    update: { status: "ACTIVE", roleLabel: parsed.data.roleLabel, replacedAt: null },
    create: {
      teamId: team.id,
      freelancerProfileId: candidate.id,
      roleLabel: parsed.data.roleLabel,
      displayOrder: team.members.length,
    },
  });

  await sendEmail({ to: candidate.user.email, ...emailTemplates.teamMemberReplaced({ teamName: team.name, roleLabel: parsed.data.roleLabel }) });
  await createNotification({
    userId: candidate.userId,
    type: "team",
    title: "Added to a team",
    body: `You've been added to "${team.name}" as ${parsed.data.roleLabel}.`,
    linkUrl: `/teams/${team.slug}`,
  });

  return NextResponse.json({ member }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
