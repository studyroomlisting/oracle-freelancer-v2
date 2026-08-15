import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";

// ADDED (admin gap): clients can delete their own posting only while it has
// zero applications (see app/api/projects/[id]/route.ts DELETEHandler) —
// that restriction exists to protect real proposal/order history from a
// client's own accidental click, not to lock admin out of moderation.
// Admin needed a separate, more powerful path for removing spam/test/
// abusive postings at any stage. applications cascade-delete with the
// posting (onDelete: Cascade in schema.prisma); a resultingOrder linked
// from an application is NOT cascaded (no onDelete on that relation) so
// any real Order record survives untouched for payment/audit history even
// if the application that created it is removed.
async function DELETEHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id } });
  if (!posting) throw new ApiError("Project not found", 404);

  await prisma.projectPosting.delete({ where: { id: posting.id } });

  await createAuditLog({
    adminUserId: session.sub,
    action: "project.delete",
    targetType: "ProjectPosting",
    targetId: posting.id,
    details: posting.title,
  });

  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
