import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { TEAM_PRO_PRICE_GBP_PER_MONTH } from "@/lib/constants";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// STUB: same pattern as /api/orders/[id]/pay — simulates a successful
// subscription payment so the gating logic is testable before Stripe
// Billing/Subscriptions is actually integrated.
async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub }, include: { user: true } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { freelancerProfileId: profile.id },
    update: { status: "ACTIVE", currentPeriodEnd: periodEnd, cancelledAt: null },
    create: {
      freelancerProfileId: profile.id,
      plan: "TEAM_PRO",
      priceGbpPerMonth: TEAM_PRO_PRICE_GBP_PER_MONTH,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
    },
  });

  await sendEmail({ to: profile.user.email, ...emailTemplates.subscriptionStarted() });
  await createNotification({ userId: profile.userId, type: "subscription", title: "Subscription active", body: "Your subscription is now active.", linkUrl: "/dashboard/freelancer/subscription" });

  return NextResponse.json({ subscription });
}

export const POST = withErrorHandling(POSTHandler);
