import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    include: { gig: { include: { freelancerProfile: true } }, client: true },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.gig.freelancerProfile.userId !== session.sub) {
    throw new ApiError("Only the freelancer on this order can accept it", 403);
  }
  if (order.status !== "PENDING_ACCEPTANCE") {
    throw new ApiError("This order isn't awaiting acceptance", 409);
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "IN_PROGRESS" } });
  await prisma.milestone.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "IN_PROGRESS" } });

  await sendEmail({
    to: order.client.email,
    subject: `Order accepted: ${order.gig.title}`,
    body: `Good news — your order for "${order.gig.title}" has been accepted and work is starting.`,
  });
  await createNotification({
    userId: order.clientId,
    type: "order",
    title: "Order accepted",
    body: `Your order for "${order.gig.title}" has been accepted and work is starting.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ order: updated });
}

export const POST = withErrorHandling(POSTHandler);
