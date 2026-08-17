import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// FIXED (test-scenario gap review, High): MilestoneStatus had SUBMITTED/
// APPROVED/PAID as schema states nothing ever transitioned into — there was
// no way for a freelancer to mark work delivered, or a client to approve
// it, or an order to ever reach COMPLETED. This route + the approve route
// close that loop.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: true } } },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.gig.freelancerProfile.userId !== session.sub) {
    throw new ApiError("Only the freelancer delivering this order can submit a milestone", 403);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: params.milestoneId } });
  if (!milestone || milestone.orderId !== params.id) throw new ApiError("Milestone not found", 404);
  if (milestone.status !== "PENDING" && milestone.status !== "IN_PROGRESS") {
    throw new ApiError("This milestone has already been submitted or approved", 409);
  }
  // FIXED (real bug found during review): nothing here checked
  // order.status — a freelancer could mark a milestone "delivered" while
  // the order was still PENDING_ACCEPTANCE (before they'd even accepted
  // it) or PENDING_PAYMENT. That leaves an inconsistent state: the
  // milestone says SUBMITTED (client sees an "Approve" button) while the
  // order itself is stuck showing "Awaiting freelancer acceptance" —
  // work delivered on an order that was never actually accepted.
  if (order.status !== "IN_PROGRESS" && order.status !== "IN_REVISION") {
    throw new ApiError("Accept the order before submitting delivered work", 409);
  }

  const updated = await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), revisionNote: null, revisionRequestedAt: null },
  });

  // FIXED (Milestone 8 gap): Order.status never actually reflected "work
  // delivered, awaiting your review" — it silently stayed IN_PROGRESS the
  // whole time until every milestone was approved, then jumped straight to
  // COMPLETED. A client had no way to tell delivered-and-waiting apart
  // from still-being-worked-on without opening the milestones list.
  const allMilestones = await prisma.milestone.findMany({ where: { orderId: params.id } });
  const allSubmittedOrApproved = allMilestones.every((m: { id: string; status: string }) =>
    m.id === milestone.id ? true : m.status === "SUBMITTED" || m.status === "APPROVED"
  );
  if (allSubmittedOrApproved && (order.status === "IN_PROGRESS" || order.status === "IN_REVISION")) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
  }

  const client = await prisma.user.findUnique({ where: { id: order.clientId } });
  if (client) {
    await sendEmail({ to: client.email, ...emailTemplates.milestoneSubmitted({ gigTitle: order.gig.title, milestoneTitle: milestone.title }) });
    await createNotification({
      userId: client.id,
      type: "milestone",
      title: "Work delivered",
      body: `"${milestone.title}" has been submitted for "${order.gig.title}" — review it now.`,
      linkUrl: `/orders/${order.id}`,
    });
  }

  return NextResponse.json({ milestone: updated });
}

export const POST = withErrorHandling(POSTHandler);
