import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// FIXED (test-scenario gap review, Medium-High): OrderStatus.CANCELLED
// existed in the schema; no route ever set it, for either party. A client
// (or the fulfilling freelancer) had no way to cancel an order at all.
// Cancellable only from PENDING_PAYMENT or IN_PROGRESS — not from
// COMPLETED (nothing to cancel) or an already-terminal state.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true, gigPackage: true },
  });
  if (!order) throw new ApiError("Order not found", 404);

  const isClient = order.clientId === session.sub;
  const isFreelancer = order.gig.freelancerProfile.userId === session.sub;
  if (!isClient && !isFreelancer) throw new ApiError("You don't have access to this order", 403);

  if (order.status !== "PENDING_PAYMENT" && order.status !== "PENDING_ACCEPTANCE" && order.status !== "IN_PROGRESS") {
    throw new ApiError("This order can no longer be cancelled", 409);
  }

  // Order doesn't store seat count directly — for a workshop order,
  // totalPriceGbp = package price × seats booked, so it can be derived
  // rather than assuming 1 (a multi-seat booking needs its actual seat
  // count released, not just one).
  const seatCount = order.gig.gigType === "WORKSHOP" ? Math.max(1, Math.round(Number(order.totalPriceGbp) / Number(order.gigPackage.priceGbp))) : 0;
  // FIXED (Milestone 11 gap): decline (Phase 50) already logged a refund
  // transaction when a paid order was declined — cancel didn't, despite
  // being the same "money should move back" event for a paid order. Only
  // applies when payment actually happened (not PENDING_PAYMENT).
  const wasAlreadyPaid = order.status !== "PENDING_PAYMENT";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    if (order.gig.gigType === "WORKSHOP") {
      await tx.gig.update({ where: { id: order.gigId }, data: { seatsBooked: { decrement: seatCount } } });
    }
    if (wasAlreadyPaid) {
      await tx.transaction.create({
        data: {
          orderId: order.id,
          userId: order.clientId,
          type: "REFUND",
          status: "SUCCEEDED",
          amountGbp: order.totalPriceGbp,
          reference: `cancel_refund_${order.id.slice(-8)}`,
        },
      });
    }
  });

  const cancelledBy = isClient ? "client" : "freelancer";
  const notifyEmail = isClient ? order.gig.freelancerProfile.user.email : order.client.email;
  const notifyUserId = isClient ? order.gig.freelancerProfile.userId : order.clientId;
  await sendEmail({ to: notifyEmail, ...emailTemplates.orderCancelled({ gigTitle: order.gig.title, cancelledBy }) });
  await createNotification({
    userId: notifyUserId,
    type: "order",
    title: "Order cancelled",
    body: `The order for "${order.gig.title}" was cancelled by the ${cancelledBy}.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
