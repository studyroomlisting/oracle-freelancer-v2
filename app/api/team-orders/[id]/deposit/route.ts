import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// STUB: simulates a deposit payment, same pattern as /api/orders/[id]/pay.
// Replace with a real Stripe PaymentIntent once Stripe Connect is built.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: { team: { include: { teamLeader: { include: { user: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Team order not found" }, { status: 404 });
  if (order.clientId !== session.sub) return NextResponse.json({ error: "You don't have access to this request" }, { status: 403 });
  if (order.status !== "REQUESTED") return NextResponse.json({ error: "This request isn't awaiting a deposit" }, { status: 409 });

  const updated = await prisma.teamOrder.update({
    where: { id: order.id },
    data: { status: "DEPOSIT_PAID", depositPaidAt: new Date() },
  });

  if (order.team) {
    await sendEmail({ to: order.team.teamLeader.user.email, ...emailTemplates.depositPaid({ teamName: order.team.name }) });
    await createNotification({
      userId: order.team.teamLeader.userId,
      type: "payment",
      title: "Deposit paid",
      body: `The deposit for "${order.team.name}" has been paid.`,
      linkUrl: `/team-orders/${order.id}`,
    });
  }

  return NextResponse.json({ teamOrder: updated });
}

export const POST = withErrorHandling(POSTHandler);
