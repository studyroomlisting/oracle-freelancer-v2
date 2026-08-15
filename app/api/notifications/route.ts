import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Backs both the bell dropdown (small, recent) and the full history page
// (paginated) — the same shape, ?limit vs ?page just changes how much
// comes back.
async function GETHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [notifications, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: session.sub } }),
  ]);

  return NextResponse.json({ notifications, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
}

export const GET = withErrorHandling(GETHandler);
