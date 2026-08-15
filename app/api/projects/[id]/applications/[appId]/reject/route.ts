import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string; appId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id } });
  if (!posting) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (posting.clientId !== session.sub) {
    return NextResponse.json({ error: "Only the project owner can reject an application" }, { status: 403 });
  }

  const application = await prisma.projectApplication.update({
    where: { id: params.appId },
    data: { status: "REJECTED" },
    include: {
      freelancerProfile: { include: { user: true } },
      team: { include: { teamLeader: { include: { user: true } } } },
    },
  });

  // FIXED (feature gap): a rejected applicant previously had no way to know
  // — they'd only find out by checking back on the project page themselves.
  const notifyEmail = application.teamId ? application.team?.teamLeader.user.email : application.freelancerProfile?.user.email;
  const notifyUserId = application.teamId ? application.team?.teamLeader.userId : application.freelancerProfile?.userId;
  if (notifyEmail) {
    await sendEmail({ to: notifyEmail, ...emailTemplates.applicationRejected({ projectTitle: posting.title }) });
  }
  if (notifyUserId) {
    await createNotification({
      userId: notifyUserId,
      type: "project",
      title: "Application update",
      body: `The client moved forward with another proposal for "${posting.title}".`,
      linkUrl: `/projects/${posting.slug}`,
    });
  }

  return NextResponse.json({ application });
}

export const POST = withErrorHandling(POSTHandler);
