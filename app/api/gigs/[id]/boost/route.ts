import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

// FIXED (real gap found during review): "Featured" was entirely
// admin-curated with no self-service path — a freelancer had no way to
// pay for premium placement for their own gig, the way real marketplaces
// (Fiverr's "Promoted Gigs", Etsy's paid promotion) commonly offer.
// Pricing is fixed, tiered by duration — simulated the same honest way
// every other payment on this platform is (see PROJECT_STATUS.md).
const DURATION_OPTIONS: Record<string, { days: number; priceGbp: number }> = {
  "7": { days: 7, priceGbp: 15 },
  "14": { days: 14, priceGbp: 25 },
  "30": { days: 30, priceGbp: 45 },
};

const schema = z.object({ duration: z.enum(["7", "14", "30"]) });

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireFreelancerSession(req);
  if (!session) throw new ApiError("Freelancer session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("A valid duration is required", 400);

  const gig = await prisma.gig.findUnique({ where: { id: params.id }, include: { freelancerProfile: true } });
  if (!gig) throw new ApiError("Gig not found", 404);
  if (gig.freelancerProfile.userId !== session.sub) throw new ApiError("You can only boost your own gigs", 403);
  if (gig.status !== "ACTIVE") throw new ApiError("Only an active, approved gig can be boosted", 409);

  const { days, priceGbp } = DURATION_OPTIONS[parsed.data.duration];
  // Extends from the current boostedUntil if still active (stacking a
  // renewal), otherwise from now — so buying more time never shortens an
  // already-active boost.
  const startFrom = gig.boostedUntil && gig.boostedUntil > new Date() ? gig.boostedUntil : new Date();
  const boostedUntil = new Date(startFrom.getTime() + days * 24 * 60 * 60 * 1000);

  const [updated] = await prisma.$transaction([
    prisma.gig.update({ where: { id: gig.id }, data: { boostedUntil } }),
    prisma.transaction.create({
      data: {
        userId: session.sub,
        type: "BOOST_PURCHASE",
        status: "SUCCEEDED",
        amountGbp: priceGbp,
        reference: `boost_${gig.id.slice(-8)}_${Date.now().toString(36)}`,
      },
    }),
  ]);

  await createNotification({
    userId: session.sub,
    type: "gig",
    title: "Gig boosted",
    body: `"${gig.title}" is now featured until ${boostedUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
    linkUrl: `/gigs/${gig.slug}`,
  });
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (user) {
    await sendEmail({
      to: user.email,
      subject: `"${gig.title}" is now featured`,
      body: `Your £${priceGbp.toFixed(2)} boost is active — "${gig.title}" will appear in featured placement until ${boostedUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
    });
  }

  return NextResponse.json({ gig: { id: updated.id, boostedUntil: updated.boostedUntil } });
}

export const POST = withErrorHandling(POSTHandler);
