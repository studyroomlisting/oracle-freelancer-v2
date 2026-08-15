import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { canAccessTeamOrderWorkspace } from "@/lib/workspace";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

const schema = z.object({ title: z.string().min(2).max(200), assignedToUserId: z.string().optional() });

async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessTeamOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const tasks = await prisma.workspaceTask.findMany({ where: { teamOrderId: params.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ tasks });
}

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessTeamOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A task title is required" }, { status: 400 });

  if (parsed.data.assignedToUserId && !(await canAccessTeamOrderWorkspace(parsed.data.assignedToUserId, params.id))) {
    return NextResponse.json({ error: "Can only assign tasks to a participant in this engagement" }, { status: 400 });
  }

  const task = await prisma.workspaceTask.create({
    data: {
      teamOrderId: params.id,
      title: parsed.data.title,
      createdByUserId: session.sub,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
    },
  });

  // FIXED (real gap found during review): notifies the client and team
  // leader — the same two-party scope already used for team-order
  // cancel/deposit notifications elsewhere in this app, not every
  // individual team member, since canAccessTeamOrderWorkspace's broader
  // membership check doesn't map cleanly to a single "other party."
  const order = await prisma.teamOrder.findUnique({ where: { id: params.id }, include: { team: { include: { teamLeader: { include: { user: true } } } }, client: true } });
  if (order?.team) {
    const notifyUserId = parsed.data.assignedToUserId ?? (session.sub === order.clientId ? order.team.teamLeader.userId : order.clientId);
    if (notifyUserId !== session.sub) {
      const notifyUser = notifyUserId === order.clientId ? order.client : order.team.teamLeader.user;
      await createNotification({
        userId: notifyUserId,
        type: "team",
        title: parsed.data.assignedToUserId ? "New task assigned to you" : "New workspace task",
        body: `"${task.title}" — ${order.team.name}`,
        linkUrl: `/team-orders/${order.id}/workspace`,
      });
      await sendEmail({
        to: notifyUser.email,
        subject: `New task on ${order.team.name}`,
        body: `A new task was added to the shared workspace for "${order.team.name}": "${task.title}".`,
      });
    }
  }

  return NextResponse.json({ task }, { status: 201 });
}

export const GET = withErrorHandling(GETHandler);
export const POST = withErrorHandling(POSTHandler);
