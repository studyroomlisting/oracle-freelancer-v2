import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { calculateVatAmount } from "@/lib/pricing";
import { createNotification } from "@/lib/notifications";

// STUB: this simulates payment so the order flow is testable end-to-end
// before Stripe Connect is wired in. Replace the body of this handler with
// a real Stripe PaymentIntent confirmation + webhook when that phase is
// built — the Order/Milestone schema is already shaped for it (see
// stripePaymentId on Order).
//
// FIXED (Milestone 10 gap): the stub previously had no failure branch at
// all — every call unconditionally succeeded, meaning "Test Failed
// Payment" had nothing to actually exercise. `simulateFailure` is a
// deliberate, clearly-labeled test-only affordance (documented as such,
// not a hidden backdoor) that lets that scenario be genuinely tested in
// this environment — the real failure path once Stripe is wired in comes
// from its webhook, not a client-supplied flag.
const schema = z.object({ simulateFailure: z.boolean().optional() });

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { gig: true, client: true } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.clientId !== session.sub) {
    return NextResponse.json({ error: "You don't have access to this order" }, { status: 403 });
  }
  // FIXED (Milestone 10 gap): also closes "Test Duplicate Payment" —
  // this check already made a second pay attempt on an already-paid order
  // fail with a clear 409 rather than silently double-processing it.
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "This order isn't awaiting payment, or has already been paid" }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const simulateFailure = parsed.success && parsed.data.simulateFailure === true;

  if (simulateFailure) {
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        userId: session.sub,
        type: "PAYMENT",
        status: "FAILED",
        amountGbp: order.totalPriceGbp,
        failureReason: "Simulated failure for testing — card declined",
      },
    });
    return NextResponse.json({ error: "Payment failed — your card was declined. Please try again." }, { status: 402 });
  }

  const vatAmountGbp = calculateVatAmount(Number(order.totalPriceGbp));
  const reference = `sim_${Date.now().toString(36)}`;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PENDING_ACCEPTANCE",
      stripePaymentId: reference,
      vatAmountGbp,
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order.id,
      userId: session.sub,
      type: "PAYMENT",
      status: "SUCCEEDED",
      amountGbp: order.totalPriceGbp,
      reference,
    },
  });

  const freelancer = await prisma.gig.findUnique({ where: { id: order.gigId }, include: { freelancerProfile: { include: { user: true } } } });
  if (freelancer) {
    await sendEmail({
      to: freelancer.freelancerProfile.user.email,
      subject: `New order to confirm: ${order.gig.title}`,
      body: `A client has paid for "${order.gig.title}" and is waiting for you to accept the order. Log in to accept or decline.`,
    });
    await createNotification({
      userId: freelancer.freelancerProfile.userId,
      type: "payment",
      title: "New order to confirm",
      body: `A client has paid for "${order.gig.title}" — accept or decline it.`,
      linkUrl: `/orders/${order.id}`,
    });
  }

  await sendEmail({
    to: order.client.email,
    ...emailTemplates.orderConfirmed({ gigTitle: order.gig.title, totalGbp: Number(order.totalPriceGbp) }),
  });

  return NextResponse.json({ order: updated });
}

export const POST = withErrorHandling(POSTHandler);
