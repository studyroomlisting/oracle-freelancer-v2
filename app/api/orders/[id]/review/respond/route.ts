import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ response: z.string().min(5).max(1000) });

// FIXED (real gap found during review): sellers had no way at all to
// respond to a review — a standard feature in every real marketplace.
// One response per review, matching the review's own one-shot pattern —
// this isn't a back-and-forth thread, just a public right-of-reply.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "A response is required", 400);

  const review = await prisma.review.findUnique({
    where: { orderId: params.id },
    include: {
      freelancerProfile: true,
      gig: true,
      author: true,
    },
  });
  if (!review) throw new ApiError("No review exists for this order yet", 404);
  if (review.freelancerProfile.userId !== session.sub) throw new ApiError("You can only respond to reviews on your own gigs", 403);
  if (review.sellerResponse) throw new ApiError("You've already responded to this review", 409);

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { sellerResponse: parsed.data.response, sellerRespondedAt: new Date() },
  });

  await sendEmail({
    to: review.author.email,
    subject: `${review.freelancerProfile ? "The freelancer" : "The seller"} responded to your review`,
    body: `Your review on "${review.gig.title}" received a response:\n\n"${parsed.data.response}"`,
  });
  await createNotification({
    userId: review.authorId,
    type: "order",
    title: "Review response",
    body: `Your review on "${review.gig.title}" received a response.`,
    linkUrl: `/orders/${review.orderId}`,
  });

  return NextResponse.json({ review: updated });
}

export const POST = withErrorHandling(POSTHandler);
