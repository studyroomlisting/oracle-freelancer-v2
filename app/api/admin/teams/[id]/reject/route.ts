import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({ reason: z.string().min(3) });

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Admin session required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const team = await prisma.team.update({
    where: { id: params.id },
    data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: parsed.data.reason },
    include: { teamLeader: { include: { user: true } } },
  });

  await sendEmail({ to: team.teamLeader.user.email, ...emailTemplates.teamRejected({ teamName: team.name, reason: parsed.data.reason }) });
  await createNotification({
    userId: team.teamLeader.userId,
    type: "team",
    title: "Team needs changes",
    body: `"${team.name}" wasn't approved: ${parsed.data.reason}`,
    linkUrl: "/dashboard/freelancer",
  });
  await createAuditLog({ adminUserId: session.sub, action: "team.reject", targetType: "Team", targetId: team.id, details: parsed.data.reason });

  return NextResponse.json({ team: { id: team.id, slug: team.slug, name: team.name, status: team.status, rejectionReason: team.rejectionReason } });
}

export const POST = withErrorHandling(POSTHandler);
