import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Backs the polling in app/messages/[userId]/page.tsx's client component —
// there's no WebSocket/push infrastructure here (that needs a third-party
// service like Pusher/Ably), so "real-time" is honestly short-interval
// polling against this endpoint instead. Marks incoming messages as read
// on each call, same as the server-rendered initial load.
async function GETHandler(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.sub, receiverId: params.userId },
        { senderId: params.userId, receiverId: session.sub },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: { gig: { select: { slug: true, title: true } } },
  });

  await prisma.message.updateMany({
    where: { senderId: params.userId, receiverId: session.sub, readAt: null },
    data: { readAt: new Date() },
  });

  // Piggybacks on the existing poll interval to update online status —
  // avoids adding a separate heartbeat endpoint just for this.
  await prisma.user.update({ where: { id: session.sub }, data: { lastActiveAt: new Date() } });

  return NextResponse.json({ messages });
}

export const GET = withErrorHandling(GETHandler);
