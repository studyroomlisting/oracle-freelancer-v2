import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z.object({
  coverLetter: z.string().min(20, "Add a bit more detail about your approach."),
  proposedPriceGbp: z.coerce.number().positive(),
  proposedWeeks: z.coerce.number().int().positive(),
  teamId: z.string().optional(), // if set, applying on behalf of a team the caller leads
});

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "You need a freelancer account to apply" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application" }, { status: 400 });
  }

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id }, include: { client: true } });
  if (!posting || posting.status !== "OPEN") {
    return NextResponse.json({ error: "This project is no longer accepting applications" }, { status: 409 });
  }

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  let teamId: string | null = null;
  let notifySubject: string;

  if (parsed.data.teamId) {
    // Applying as a team — caller must be that team's leader.
    const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
    if (!team || team.teamLeaderId !== profile.id) {
      return NextResponse.json({ error: "You can only apply on behalf of a team you lead" }, { status: 403 });
    }
    if (team.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only an approved, active team can apply" }, { status: 409 });
    }
    teamId = team.id;
    const existingTeamApp = await prisma.projectApplication.findUnique({
      where: { projectPostingId_teamId: { projectPostingId: posting.id, teamId } },
    });
    if (existingTeamApp) {
      return NextResponse.json({ error: "This team has already applied to this project" }, { status: 409 });
    }
    notifySubject = `New team application: ${posting.title}`;
  } else {
    const existing = await prisma.projectApplication.findUnique({
      where: { projectPostingId_freelancerProfileId: { projectPostingId: posting.id, freelancerProfileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You've already applied to this project" }, { status: 409 });
    }
    notifySubject = `New application: ${posting.title}`;
  }

  const application = await prisma.projectApplication.create({
    data: {
      projectPostingId: posting.id,
      freelancerProfileId: teamId ? null : profile.id,
      teamId,
      coverLetter: parsed.data.coverLetter,
      proposedPriceGbp: parsed.data.proposedPriceGbp,
      proposedWeeks: parsed.data.proposedWeeks,
    },
  });

  await sendEmail({
    to: posting.client.email,
    subject: notifySubject,
    body: `A ${teamId ? "team" : "freelancer"} applied to "${posting.title}" with a proposal of £${parsed.data.proposedPriceGbp}. Log in to review.`,
  });
  await createNotification({
    userId: posting.clientId,
    type: "project",
    title: "New application",
    body: `A ${teamId ? "team" : "freelancer"} applied to "${posting.title}" with a proposal of £${parsed.data.proposedPriceGbp}.`,
    linkUrl: `/projects/${posting.slug}`,
  });

  return NextResponse.json({ application }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
