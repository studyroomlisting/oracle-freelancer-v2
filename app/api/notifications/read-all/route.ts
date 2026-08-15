import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  await prisma.notification.updateMany({ where: { userId: session.sub, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
