import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { canAccessOrderWorkspace } from "@/lib/workspace";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function DELETEHandler(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canAccessOrderWorkspace(session.sub, params.id))) {
    return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
  }

  const note = await prisma.workspaceNote.findUnique({ where: { id: params.noteId } });
  if (!note || note.orderId !== params.id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  // RBAC: only the person who wrote a note can delete it — nobody else,
  // regardless of client/provider role, can remove someone else's entry
  // from the decision log.
  if (note.authorUserId !== session.sub) {
    return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
  }

  await prisma.workspaceNote.delete({ where: { id: params.noteId } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
