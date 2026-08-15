import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { canAccessTeamOrderWorkspace, getTeamOrderWorkspaceRole } from "@/lib/workspace";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  assignedToUserId: z.string().nullable().optional(),
});

async function PATCHHandler(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessTeamOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  if (parsed.data.status === "DONE") {
    const role = await getTeamOrderWorkspaceRole(session.sub, params.id);
    if (role !== "provider") {
      return NextResponse.json({ error: "Only the team can mark a task as Done" }, { status: 403 });
    }
  }

  if (parsed.data.assignedToUserId && !(await canAccessTeamOrderWorkspace(parsed.data.assignedToUserId, params.id))) {
    return NextResponse.json({ error: "Can only assign tasks to a participant in this engagement" }, { status: 400 });
  }

  const task = await prisma.workspaceTask.update({
    where: { id: params.taskId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.assignedToUserId !== undefined ? { assignedToUserId: parsed.data.assignedToUserId } : {}),
    },
  });
  return NextResponse.json({ task });
}

export const PATCH = withErrorHandling(PATCHHandler);
