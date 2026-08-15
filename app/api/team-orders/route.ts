import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { calculateTeamEngagementTotal } from "@/lib/pricing";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const compositionRow = z.object({
  role: z.string(),
  consultantSlug: z.string(),
  consultantName: z.string(),
  dayRateGbp: z.coerce.number().positive(),
});

const prebuiltSchema = z.object({
  teamId: z.string().min(1),
});

const customSchema = z.object({
  customComposition: z.array(compositionRow).min(1),
  estimatedWeeks: z.coerce.number().int().positive(),
  requiredRoles: z.record(z.any()).optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) {
    return NextResponse.json({ error: "You need to be signed in to request a team" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  // Pre-built team request
  if (body.teamId) {
    const parsed = prebuiltSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid team request" }, { status: 400 });

    const team = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      include: { teamLeader: { include: { user: true } } },
    });
    if (!team || team.status !== "ACTIVE") {
      return NextResponse.json({ error: "This team is not available" }, { status: 404 });
    }

    const totalEstimateGbp = calculateTeamEngagementTotal(Number(team.dailyRateGbp), team.estimatedWeeks);
    const order = await prisma.teamOrder.create({
      data: {
        teamId: team.id,
        clientId: session.sub,
        dailyRateGbp: team.dailyRateGbp,
        estimatedWeeks: team.estimatedWeeks,
        totalEstimateGbp,
      },
    });

    await sendEmail({
      to: team.teamLeader.user.email,
      ...emailTemplates.teamOrderRequested({ teamName: team.name }),
    });
    await createNotification({
      userId: team.teamLeader.userId,
      type: "team",
      title: "New engagement request",
      body: `A client has requested "${team.name}" for a project.`,
      linkUrl: `/team-orders/${order.id}`,
    });

    return NextResponse.json({ teamOrderId: order.id }, { status: 201 });
  }

  // Custom composition (LEGO picker or AI recommendation)
  const parsed = customSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid custom team request" }, { status: 400 });
  }
  const { customComposition, estimatedWeeks, requiredRoles } = parsed.data;

  const dailyRateGbp = customComposition.reduce((sum, c) => sum + c.dayRateGbp, 0);
  const totalEstimateGbp = calculateTeamEngagementTotal(dailyRateGbp, estimatedWeeks);

  const order = await prisma.teamOrder.create({
    data: {
      clientId: session.sub,
      customComposition: customComposition as any,
      requiredRoles: requiredRoles as any,
      dailyRateGbp,
      estimatedWeeks,
      totalEstimateGbp,
    },
  });

  return NextResponse.json({ teamOrderId: order.id }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
