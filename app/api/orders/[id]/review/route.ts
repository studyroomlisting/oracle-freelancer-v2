import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { recomputeAverageRating } from "@/lib/reviews";

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

// FIXED (test-scenario gap review, High): Review existed in the schema and
// ratingAvg/ratingCount were displayed everywhere (gig cards, profiles,
// teams) — but there was no route to ever create one. Every rating shown
// across the app was permanently static seed data. This closes the loop:
// review creation, tied to order completion, recomputes the freelancer's
// real rating.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid review", 400);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: true } }, review: true },
  });
  if (!order) throw new ApiError("Order not found", 404);
  if (order.clientId !== session.sub) throw new ApiError("Only the client on this order can leave a review", 403);
  if (order.status !== "COMPLETED") throw new ApiError("You can only review a completed order", 409);
  if (order.review) throw new ApiError("You've already reviewed this order", 409);

  const { rating, comment } = parsed.data;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.review.create({
      data: {
        orderId: order.id,
        gigId: order.gigId,
        freelancerProfileId: order.gig.freelancerProfileId,
        authorId: session.sub,
        rating,
        comment,
      },
    });

    const { avg, count } = recomputeAverageRating(
      Number(order.gig.freelancerProfile.ratingAvg),
      order.gig.freelancerProfile.ratingCount,
      rating
    );
    await tx.freelancerProfile.update({
      where: { id: order.gig.freelancerProfileId },
      data: { ratingAvg: avg, ratingCount: count },
    });
  });

  const freelancerProfile = await prisma.freelancerProfile.findUnique({
    where: { id: order.gig.freelancerProfileId },
    include: { user: true },
  });
  if (freelancerProfile) {
    await sendEmail({ to: freelancerProfile.user.email, ...emailTemplates.reviewReceived({ gigTitle: order.gig.title, rating }) });
    await createNotification({
      userId: freelancerProfile.userId,
      type: "order",
      title: "New review",
      body: `You received a ${rating}-star review for "${order.gig.title}".`,
      linkUrl: `/orders/${order.id}`,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
