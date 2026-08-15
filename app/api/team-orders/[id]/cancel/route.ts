import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// Same gap as the gig-order cancel route, for team engagements. Cancellable
// only from REQUESTED or DEPOSIT_PAID — not once work is IN_PROGRESS
// (that needs a real off-platform conversation, not a one-click cancel).
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: { team: { include: { teamLeader: { include: { user: true } } } }, client: true },
  });
  if (!order) throw new ApiError("Team request not found", 404);

  const isClient = order.clientId === session.sub;
  const isLeader = order.team?.teamLeader.userId === session.sub;
  if (!isClient && !isLeader) throw new ApiError("You don't have access to this request", 403);

  if (order.status !== "REQUESTED" && order.status !== "DEPOSIT_PAID") {
    throw new ApiError("This request can no longer be cancelled", 409);
  }

  await prisma.teamOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });

  const teamName = order.team?.name ?? "your custom team engagement";
  const notifyEmail = isClient ? order.team?.teamLeader.user.email : order.client.email;
  const notifyUserId = isClient ? order.team?.teamLeader.userId : order.clientId;
  if (notifyEmail) {
    await sendEmail({ to: notifyEmail, ...emailTemplates.orderCancelled({ gigTitle: teamName, cancelledBy: isClient ? "client" : "team leader" }) });
  }
  if (notifyUserId) {
    await createNotification({
      userId: notifyUserId,
      type: "order",
      title: "Engagement cancelled",
      body: `"${teamName}" was cancelled by the ${isClient ? "client" : "team leader"}.`,
      linkUrl: `/team-orders/${order.id}`,
    });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
