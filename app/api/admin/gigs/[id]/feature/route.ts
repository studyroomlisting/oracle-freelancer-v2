import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";

// Toggles a gig's featured status — only ACTIVE gigs can be featured
// (featuring a draft/pending/paused gig would show it nowhere useful).
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const gig = await prisma.gig.findUnique({ where: { id: params.id } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.status !== "ACTIVE") throw new ApiError("Only an active gig can be featured", 409);

  const updated = await prisma.gig.update({ where: { id: gig.id }, data: { isFeatured: !gig.isFeatured } });
  await createAuditLog({ adminUserId: session.sub, action: updated.isFeatured ? "gig.feature" : "gig.unfeature", targetType: "Gig", targetId: gig.id });
  return NextResponse.json({ id: updated.id, isFeatured: updated.isFeatured });
}

export const POST = withErrorHandling(POSTHandler);
