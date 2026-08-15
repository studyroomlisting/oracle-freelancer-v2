import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { canAccessOrderWorkspace } from "@/lib/workspace";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

const schema = z.object({ title: z.string().min(2).max(200), assignedToUserId: z.string().optional() });

async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const tasks = await prisma.workspaceTask.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ tasks });
}

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A task title is required" }, { status: 400 });

  // Assignee must also have access to this workspace — prevents assigning
  // work to someone unrelated to the order.
  if (parsed.data.assignedToUserId && !(await canAccessOrderWorkspace(parsed.data.assignedToUserId, params.id))) {
    return NextResponse.json({ error: "Can only assign tasks to a participant in this order" }, { status: 400 });
  }

  const task = await prisma.workspaceTask.create({
    data: {
      orderId: params.id,
      title: parsed.data.title,
      createdByUserId: session.sub,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
    },
  });

  // FIXED (real gap found during review): no workspace event — creating a
  // task or note — ever notified the other party at all. Proportionate
  // fix: only new items notify, not every toggle/edit, matching the
  // "meaningful event" bar used everywhere else in this app rather than
  // creating noisy per-click notifications for routine task management.
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true },
  });
  if (order) {
    const notifyUserId = parsed.data.assignedToUserId ?? (session.sub === order.clientId ? order.gig.freelancerProfile.userId : order.clientId);
    if (notifyUserId !== session.sub) {
      const notifyUser = notifyUserId === order.clientId ? order.client : order.gig.freelancerProfile.user;
      await createNotification({
        userId: notifyUserId,
        type: "order",
        title: parsed.data.assignedToUserId ? "New task assigned to you" : "New workspace task",
        body: `"${task.title}" — ${order.gig.title}`,
        linkUrl: `/orders/${order.id}/workspace`,
      });
      await sendEmail({
        to: notifyUser.email,
        subject: `New task on ${order.gig.title}`,
        body: `A new task was added to the shared workspace for "${order.gig.title}": "${task.title}".`,
      });
    }
  }

  return NextResponse.json({ task }, { status: 201 });
}

export const GET = withErrorHandling(GETHandler);
export const POST = withErrorHandling(POSTHandler);
