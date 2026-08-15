import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { canAccessTeamOrderWorkspace } from "@/lib/workspace";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  body: z.string().min(1).max(4000),
  attachmentUrl: z.string().max(500).optional(),
  attachmentName: z.string().max(200).optional(),
});

async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessTeamOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const notes = await prisma.workspaceNote.findMany({
    where: { teamOrderId: params.id },
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });
  return NextResponse.json({ notes });
}

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessTeamOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Note text is required" }, { status: 400 });

  const note = await prisma.workspaceNote.create({
    data: {
      teamOrderId: params.id,
      body: parsed.data.body,
      authorUserId: session.sub,
      attachmentUrl: parsed.data.attachmentUrl,
      attachmentName: parsed.data.attachmentName,
    },
    include: { author: true },
  });

  const order = await prisma.teamOrder.findUnique({ where: { id: params.id }, include: { team: { include: { teamLeader: { include: { user: true } } } }, client: true } });
  if (order?.team) {
    const notifyUserId = session.sub === order.clientId ? order.team.teamLeader.userId : order.clientId;
    if (notifyUserId !== session.sub) {
      const notifyUser = notifyUserId === order.clientId ? order.client : order.team.teamLeader.user;
      await createNotification({
        userId: notifyUserId,
        type: "team",
        title: "New workspace note",
        body: `${note.author.fullName} added a note on "${order.team.name}".`,
        linkUrl: `/team-orders/${order.id}/workspace`,
      });
      await sendEmail({
        to: notifyUser.email,
        subject: `New note on ${order.team.name}`,
        body: `${note.author.fullName} added a note to the shared workspace for "${order.team.name}".`,
      });
    }
  }

  return NextResponse.json({ note }, { status: 201 });
}

export const GET = withErrorHandling(GETHandler);
export const POST = withErrorHandling(POSTHandler);
