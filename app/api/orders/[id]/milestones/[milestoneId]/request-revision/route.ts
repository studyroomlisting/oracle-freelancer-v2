import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ note: z.string().min(5).max(2000) });

// FIXED (Milestone 8 gap): a client previously had exactly one option once
// work was submitted — approve it. There was no way to say "this isn't
// right, please fix X" without either approving unsatisfactory work or
// escalating to a dispute. Sends the milestone back to IN_PROGRESS (the
// freelancer resubmits through the existing submit route) and moves the
// order to IN_REVISION so its status honestly reflects what's happening.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string; milestoneId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } } },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.clientId !== session.sub) throw new ApiError("Only the client can request changes to this order", 403);

  const milestone = await prisma.milestone.findUnique({ where: { id: params.milestoneId } });
  if (!milestone || milestone.orderId !== params.id) throw new ApiError("Milestone not found", 404);
  if (milestone.status !== "SUBMITTED") throw new ApiError("Only submitted work awaiting your review can have changes requested", 409);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("Please explain what needs to change", 400);

  const updatedMilestone = await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: "IN_PROGRESS", submittedAt: null, revisionNote: parsed.data.note, revisionRequestedAt: new Date() },
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: "IN_REVISION" } });

  await sendEmail({
    to: order.gig.freelancerProfile.user.email,
    subject: `Changes requested: ${order.gig.title}`,
    body: `The client has requested changes to "${milestone.title}" for "${order.gig.title}":\n\n${parsed.data.note}`,
  });
  await createNotification({
    userId: order.gig.freelancerProfile.userId,
    type: "order",
    title: "Changes requested",
    body: `Changes were requested on "${milestone.title}" for "${order.gig.title}".`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ milestone: updatedMilestone });
}

export const POST = withErrorHandling(POSTHandler);
