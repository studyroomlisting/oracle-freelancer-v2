import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub }, include: { user: true } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  const subscription = await prisma.subscription.update({
    where: { freelancerProfileId: profile.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await sendEmail({ to: profile.user.email, ...emailTemplates.subscriptionCancelled() });
  await createNotification({ userId: profile.userId, type: "subscription", title: "Subscription cancelled", body: "Your subscription has been cancelled.", linkUrl: "/dashboard/freelancer/subscription" });

  return NextResponse.json({ subscription });
}

export const POST = withErrorHandling(POSTHandler);
