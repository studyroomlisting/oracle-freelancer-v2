import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification) throw new ApiError("Notification not found", 404);
  if (notification.userId !== session.sub) throw new ApiError("You don't have access to this notification", 403);

  const updated = await prisma.notification.update({ where: { id: params.id }, data: { readAt: new Date() } });
  return NextResponse.json({ notification: updated });
}

export const POST = withErrorHandling(POSTHandler);
