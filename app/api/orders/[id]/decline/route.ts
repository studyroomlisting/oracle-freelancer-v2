import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: true } }, client: true, gigPackage: true },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.gig.freelancerProfile.userId !== session.sub) {
    throw new ApiError("Only the freelancer on this order can decline it", 403);
  }
  if (order.status !== "PENDING_ACCEPTANCE") {
    throw new ApiError("This order isn't awaiting acceptance", 409);
  }

  const seatCount = order.gig.gigType === "WORKSHOP" ? Math.max(1, Math.round(Number(order.totalPriceGbp) / Number(order.gigPackage.priceGbp))) : 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    if (order.gig.gigType === "WORKSHOP") {
      await tx.gig.update({ where: { id: order.gigId }, data: { seatsBooked: { decrement: seatCount } } });
    }
    // FIXED (Milestone 10 gap): a declined-after-payment order previously
    // left no record at all that money should have moved back to the
    // client — the email even said so ("a refund would be processed
    // here"), but nothing logged it. Simulated, same honesty as
    // everything else pre-Stripe — but now at least auditable.
    await tx.transaction.create({
      data: {
        orderId: order.id,
        userId: order.clientId,
        type: "REFUND",
        status: "SUCCEEDED",
        amountGbp: order.totalPriceGbp,
        reference: `refund_${order.id.slice(-8)}`,
      },
    });
  });

  await sendEmail({
    to: order.client.email,
    subject: `Order declined: ${order.gig.title}`,
    body: `Unfortunately the freelancer wasn't able to take on your order for "${order.gig.title}". A refund would be processed here once real payments are connected.`,
  });
  await createNotification({
    userId: order.clientId,
    type: "order",
    title: "Order declined",
    body: `The freelancer wasn't able to take on your order for "${order.gig.title}". It's been cancelled and refunded.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
