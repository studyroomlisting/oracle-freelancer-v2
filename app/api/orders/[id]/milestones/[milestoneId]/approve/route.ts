import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { allMilestonesApproved } from "@/lib/reviews";
import { createNotification } from "@/lib/notifications";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } } },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.clientId !== session.sub) {
    throw new ApiError("Only the client can approve a milestone", 403);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: params.milestoneId } });
  if (!milestone || milestone.orderId !== params.id) throw new ApiError("Milestone not found", 404);
  if (milestone.status !== "SUBMITTED") {
    throw new ApiError("This milestone hasn't been submitted yet", 409);
  }

  const orderNowComplete = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.milestone.update({
      where: { id: milestone.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });

    // FIXED (Milestone 10 gap): the moment a milestone is approved is when
    // money conceptually moves to the freelancer in this simulated system
    // — record it as a real ledger entry, not just a status flip.
    await tx.transaction.create({
      data: {
        orderId: order.id,
        userId: order.gig.freelancerProfile.userId,
        type: "PAYOUT",
        status: "SUCCEEDED",
        amountGbp: milestone.amountGbp,
        reference: `payout_${milestone.id.slice(-8)}`,
      },
    });

    const allMilestones = await tx.milestone.findMany({ where: { orderId: params.id } });
    const allApproved = allMilestonesApproved(allMilestones.map((m: { id: string; status: string }) => (m.id === milestone.id ? "APPROVED" : m.status)));

    if (allApproved) {
      await tx.order.update({ where: { id: params.id }, data: { status: "COMPLETED" } });
    }
    return allApproved;
  });

  await sendEmail({
    to: order.gig.freelancerProfile.user.email,
    ...emailTemplates.milestoneApproved({ gigTitle: order.gig.title, milestoneTitle: milestone.title }),
  });
  await createNotification({
    userId: order.gig.freelancerProfile.userId,
    type: "payment",
    title: "Payout received",
    body: `£${Number(milestone.amountGbp).toFixed(2)} for "${milestone.title}" on "${order.gig.title}" has been approved.`,
    linkUrl: `/orders/${order.id}`,
  });

  if (orderNowComplete) {
    await sendEmail({ to: order.gig.freelancerProfile.user.email, ...emailTemplates.orderCompleted({ gigTitle: order.gig.title }) });
    await createNotification({
      userId: order.gig.freelancerProfile.userId,
      type: "order",
      title: "Order completed",
      body: `"${order.gig.title}" is now complete.`,
      linkUrl: `/orders/${order.id}`,
    });
  }

  return NextResponse.json({ ok: true, orderCompleted: orderNowComplete });
}

export const POST = withErrorHandling(POSTHandler);
