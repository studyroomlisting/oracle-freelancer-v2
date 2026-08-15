import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(1000),
  priceGbp: z.coerce.number().positive(),
  extraDeliveryDays: z.coerce.number().int().positive().optional(),
});

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const gig = await prisma.gig.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only manage your own gigs", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const count = await prisma.gigExtra.count({ where: { gigId: params.id } });
  if (count >= 10) throw new ApiError("You've reached the maximum of 10 extras. Remove one to add another.", 409);

  const extra = await prisma.gigExtra.create({
    data: { gigId: params.id, ...parsed.data, displayOrder: count },
  });

  return NextResponse.json({ extra }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
