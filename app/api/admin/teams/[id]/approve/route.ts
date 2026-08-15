import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Admin session required" }, { status: 403 });
  }

  const team = await prisma.team.update({
    where: { id: params.id },
    data: { status: "ACTIVE", reviewedAt: new Date(), rejectionReason: null },
    include: { teamLeader: { include: { user: true } } },
  });

  await sendEmail({ to: team.teamLeader.user.email, ...emailTemplates.teamApproved({ teamName: team.name }) });
  await createNotification({
    userId: team.teamLeader.userId,
    type: "team",
    title: "Team approved",
    body: `"${team.name}" is now live and bookable.`,
    linkUrl: `/teams/${team.slug}`,
  });
  await createAuditLog({ adminUserId: session.sub, action: "team.approve", targetType: "Team", targetId: team.id, details: team.name });

  return NextResponse.json({ team: { id: team.id, slug: team.slug, name: team.name, status: team.status } });
}

export const POST = withErrorHandling(POSTHandler);
