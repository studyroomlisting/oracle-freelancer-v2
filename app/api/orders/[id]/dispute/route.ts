import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

const schema = z.object({ reason: z.string().min(10).max(2000) });

// FIXED (Milestone 11 gap): there was no way for either party to raise a
// dispute at all. Only available once real money has actually moved
// (IN_PROGRESS/DELIVERED/IN_REVISION) — a still-unpaid order has nothing
// to dispute, and an already-COMPLETED/CANCELLED order is past the point
// disputing changes anything.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  // FIXED (final check): a party can't spam-dispute the same order (once
  // DISPUTED, raising again is already blocked below by the status check)
  // — but nothing stopped rapid disputes across many different orders,
  // which is a real, if narrow, way to spam the admin review queue.
  const { allowed } = rateLimit(`raise-dispute:${session.sub}`, 5, 60 * 60 * 1000);
  if (!allowed) throw new ApiError("Too many disputes raised recently. Please wait before raising another.", 429);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true },
  });
  if (!order) throw new ApiError("Order not found", 404);

  const isParty = order.clientId === session.sub || order.gig.freelancerProfile.userId === session.sub;
  if (!isParty) throw new ApiError("You don't have access to this order", 403);
  if (!["IN_PROGRESS", "DELIVERED", "IN_REVISION"].includes(order.status)) {
    throw new ApiError("A dispute can only be raised on an order that's currently in progress", 409);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("Please explain the issue in a bit more detail", 400);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "DISPUTED",
      // FIXED (real gap found during review): captures the order's real
      // status at the moment of dispute — DELIVERED and IN_REVISION are
      // both real, valid states a dispute can be raised from, not just
      // IN_PROGRESS, and losing which one it was would silently erase
      // genuine progress if the dispute is later dismissed.
      statusBeforeDispute: order.status,
      disputeReason: parsed.data.reason,
      disputeRaisedByUserId: session.sub,
      disputeRaisedAt: new Date(),
    },
  });

  const otherPartyUserId = session.sub === order.clientId ? order.gig.freelancerProfile.userId : order.clientId;
  const otherPartyEmail = session.sub === order.clientId ? order.gig.freelancerProfile.user.email : order.client.email;
  // FIXED (real gap found during review): every other significant order
  // event (accept, decline, cancel, milestone actions, dispute
  // RESOLUTION) sends a real email in addition to the in-app
  // notification — raising a dispute itself only ever created the
  // in-app notification. Given how high-stakes and time-sensitive a
  // dispute is, relying on someone to be actively checking the app
  // rather than also emailing them was a real, if easy-to-miss,
  // inconsistency.
  await sendEmail({
    to: otherPartyEmail,
    subject: `A dispute was raised: ${order.gig.title}`,
    body: `A dispute has been raised on the order for "${order.gig.title}".\n\n${parsed.data.reason}\n\nAn admin will review this shortly.`,
  });
  await createNotification({
    userId: otherPartyUserId,
    type: "dispute",
    title: "A dispute was raised",
    body: `A dispute was raised on the order for "${order.gig.title}". An admin will review it.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ order: { id: updated.id, status: updated.status } });
}

export const POST = withErrorHandling(POSTHandler);
