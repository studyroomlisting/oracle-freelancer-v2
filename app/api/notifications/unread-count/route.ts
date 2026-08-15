import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Polled by the bell icon — same honest polling approach already used for
// chat (no WebSocket/push infrastructure exists in this environment).
async function GETHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const count = await prisma.notification.count({ where: { userId: session.sub, readAt: null } });
  return NextResponse.json({ count });
}

export const GET = withErrorHandling(GETHandler);
