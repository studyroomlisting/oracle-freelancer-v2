import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError, ScheduleConflictError } from "@/lib/api/errors";
import { checkTrainingSessionConflict } from "@/lib/availability";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ scheduledAt: z.string().min(1) });

// FIXED (test-scenario gap review, Low-Medium): booking a training session
// was supported; changing an already-booked time was not.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("A new session time is required", 400);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } } },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.clientId !== session.sub) throw new ApiError("Only the client can reschedule this session", 403);
  if (order.gig.gigType !== "TRAINING") throw new ApiError("Only training sessions can be rescheduled", 400);
  if (order.status !== "IN_PROGRESS") throw new ApiError("This order isn't in a reschedulable state", 409);
  if (!order.scheduledAt || !order.scheduledEndAt) throw new ApiError("This order has no scheduled session", 400);

  const durationMs = order.scheduledEndAt.getTime() - order.scheduledAt.getTime();
  const newStart = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(newStart.getTime())) throw new ApiError("Invalid session time", 400);
  const newEnd = new Date(newStart.getTime() + durationMs);

  const { conflict, reason } = await checkTrainingSessionConflict(order.gig.freelancerProfileId, { start: newStart, end: newEnd });
  if (conflict) throw new ScheduleConflictError(reason);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { scheduledAt: newStart, scheduledEndAt: newEnd },
  });

  // FIXED (feature gap): the freelancer previously had no way to know their
  // session moved except by happening to check the order page again.
  await sendEmail({
    to: order.gig.freelancerProfile.user.email,
    ...emailTemplates.sessionRescheduled({
      gigTitle: order.gig.title,
      newTime: newStart.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC",
    }),
  });
  await createNotification({
    userId: order.gig.freelancerProfile.userId,
    type: "order",
    title: "Session rescheduled",
    body: `Your session for "${order.gig.title}" has been moved.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ order: updated });
}

export const POST = withErrorHandling(POSTHandler);
