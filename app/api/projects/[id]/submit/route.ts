import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id } });
  if (!posting) throw new ApiError("Project not found", 404);
  if (posting.clientId !== session.sub) throw new ApiError("You can only manage your own project posting", 403);
  if (posting.status !== "DRAFT") throw new ApiError("Only a draft project can be submitted for review", 409);

  const updated = await prisma.projectPosting.update({ where: { id: posting.id }, data: { status: "PENDING_REVIEW" } });
  return NextResponse.json({ posting: { id: updated.id, status: updated.status } });
}

export const POST = withErrorHandling(POSTHandler);
