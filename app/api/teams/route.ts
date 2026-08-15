import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { FREE_TIER_MAX_TEAMS_LED } from "@/lib/constants";
import { canLeadAnotherTeam } from "@/lib/businessRules";
import { generateSlug } from "@/lib/slug";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const memberSchema = z.object({
  freelancerSlug: z.string().min(1),
  roleLabel: z.string().min(2),
});

const schema = z.object({
  name: z.string().min(5, "Give the team a descriptive name, e.g. 'Oracle Finance Implementation Team'"),
  description: z.string().min(30, "Add a bit more detail about what this team delivers."),
  dailyRateGbp: z.coerce.number().positive(),
  estimatedWeeks: z.coerce.number().int().positive(),
  availableFromDate: z.string().min(1),
  leaderRoleLabel: z.string().min(2),
  members: z.array(memberSchema).max(10).default([]),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) {
    return NextResponse.json({ error: "You need a freelancer account to create a team" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const leaderProfile = await prisma.freelancerProfile.findUnique({
    where: { userId: session.sub },
    include: { subscription: true, teamsLed: true },
  });
  if (!leaderProfile) {
    return NextResponse.json({ error: "No freelancer profile found for this account" }, { status: 404 });
  }

  const hasActiveSubscription = leaderProfile.subscription?.status === "ACTIVE";
  const activeTeamsLed = leaderProfile.teamsLed.filter((t: { status: string }) => t.status !== "REJECTED").length;
  if (!canLeadAnotherTeam(hasActiveSubscription, activeTeamsLed, FREE_TIER_MAX_TEAMS_LED)) {
    return NextResponse.json(
      {
        error: `Free accounts can lead up to ${FREE_TIER_MAX_TEAMS_LED} team. Upgrade to Oracle Team Pro to lead unlimited teams.`,
        upgradeRequired: true,
      },
      { status: 402 }
    );
  }

  // Look up each named member by slug. Note: this is a simplification — real
  // product would send each member an invite they must accept before being
  // listed on a public team roster. For MVP, the leader adding them is final.
  const memberProfiles = await Promise.all(
    data.members.map((m) => prisma.freelancerProfile.findUnique({ where: { slug: m.freelancerSlug } }))
  );
  const missingIndex = memberProfiles.findIndex((p) => !p);
  if (missingIndex !== -1) {
    return NextResponse.json(
      { error: `No freelancer found with slug "${data.members[missingIndex].freelancerSlug}"` },
      { status: 400 }
    );
  }

  const slug = generateSlug(data.name);

  const team = await prisma.team.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      teamLeaderId: leaderProfile.id,
      dailyRateGbp: data.dailyRateGbp,
      estimatedWeeks: data.estimatedWeeks,
      availableFromDate: new Date(data.availableFromDate),
      status: "PENDING_REVIEW",
      members: {
        create: [
          { freelancerProfileId: leaderProfile.id, roleLabel: data.leaderRoleLabel, displayOrder: 0 },
          ...memberProfiles.map((p, i) => ({
            freelancerProfileId: p!.id,
            roleLabel: data.members[i].roleLabel,
            displayOrder: i + 1,
          })),
        ],
      },
    },
  });

  return NextResponse.json({ team }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
