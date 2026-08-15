import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  question: z.string().min(5).max(300),
  answer: z.string().min(5).max(2000),
});

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const gig = await prisma.gig.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const count = await prisma.gigFaqItem.count({ where: { gigId: params.id } });
  // FIXED (final check): no cap existed. 15 is generous for a real gig FAQ.
  if (count >= 15) {
    throw new ApiError("You've reached the maximum of 15 FAQ items. Remove one to add another.", 409);
  }
  const item = await prisma.gigFaqItem.create({
    data: { gigId: params.id, question: parsed.data.question, answer: parsed.data.answer, displayOrder: count },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
