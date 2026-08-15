import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { calculatePlatformFee, deriveDailyRateFromTotal } from "@/lib/pricing";
import { generateSlug } from "@/lib/slug";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string; appId: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id } });
  if (!posting) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (posting.clientId !== session.sub) {
    return NextResponse.json({ error: "Only the project owner can accept an application" }, { status: 403 });
  }
  if (posting.status !== "OPEN") {
    return NextResponse.json({ error: "This project has already been awarded or closed" }, { status: 409 });
  }

  const application = await prisma.projectApplication.findUnique({
    where: { id: params.appId },
    include: {
      freelancerProfile: { include: { user: true } },
      team: { include: { teamLeader: { include: { user: true } } } },
    },
  });
  if (!application || application.projectPostingId !== params.id) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const totalPriceGbp = Number(application.proposedPriceGbp);
  const notifyEmail = application.teamId ? application.team!.teamLeader.user.email : application.freelancerProfile!.user.email;
  const notifyUserId = application.teamId ? application.team!.teamLeader.userId : application.freelancerProfile!.userId;

  if (application.teamId) {
    // Team award: reuses the existing TeamOrder flow instead of Order, since
    // teams are billed by day rate rather than a single fixed-price package.
    // Applications store a total proposed price + weeks (matching how a
    // freelancer proposes), but TeamOrder is priced as a day rate — derive
    // one from the other so the numbers reconcile exactly with
    // calculateTeamEngagementTotal.
    const dailyRateGbp = deriveDailyRateFromTotal(totalPriceGbp, application.proposedWeeks);

    const { teamOrder } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.projectApplication.update({ where: { id: application.id }, data: { status: "ACCEPTED" } });
      await tx.projectApplication.updateMany({
        where: { projectPostingId: params.id, id: { not: application.id } },
        data: { status: "REJECTED" },
      });

      const teamOrder = await tx.teamOrder.create({
        data: {
          teamId: application.teamId!,
          clientId: posting.clientId,
          status: "REQUESTED",
          dailyRateGbp,
          estimatedWeeks: application.proposedWeeks,
          totalEstimateGbp: totalPriceGbp,
        },
      });

      await tx.projectApplication.update({ where: { id: application.id }, data: { resultingTeamOrderId: teamOrder.id } });
      await tx.projectPosting.update({
        where: { id: params.id },
        data: { status: "AWARDED", awardedApplicationId: application.id },
      });

      return { teamOrder };
    });

    await sendEmail({
      to: notifyEmail,
      subject: `Your team was awarded: ${posting.title}`,
      body: `Congratulations — your team's proposal for "${posting.title}" was accepted. A team engagement request for £${totalPriceGbp.toFixed(2)} has been created — log in to review it.`,
    });
    await createNotification({
      userId: notifyUserId,
      type: "project",
      title: "Your team was awarded the project",
      body: `"${posting.title}" — a team engagement request for £${totalPriceGbp.toFixed(2)} has been created.`,
      linkUrl: `/team-orders/${teamOrder.id}`,
    });

    return NextResponse.json({ ok: true, teamOrderId: teamOrder.id });
  }

  // Individual award: auto-creates a real Order via an ad-hoc, non-public
  // Gig — reuses the existing Order/Milestone billing flow instead of
  // building a second, parallel payment path. The Gig is flagged
  // isProjectEngagement so it never shows up in public browse/search.
  const platformFeeGbp = calculatePlatformFee(totalPriceGbp);
  const deliveryDays = Math.max(1, application.proposedWeeks * 7);
  const gigSlug = generateSlug(posting.title, `project-${Date.now().toString(36)}`);

  const { order } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.projectApplication.update({ where: { id: application.id }, data: { status: "ACCEPTED" } });
    await tx.projectApplication.updateMany({
      where: { projectPostingId: params.id, id: { not: application.id } },
      data: { status: "REJECTED" },
    });

    const gig = await tx.gig.create({
      data: {
        slug: gigSlug,
        title: posting.title,
        description: posting.description,
        categoryId: posting.categoryId,
        freelancerProfileId: application.freelancerProfileId!,
        status: "ACTIVE",
        gigType: "CONSULTING",
        isProjectEngagement: true,
        packages: {
          create: [
            {
              tier: "BASIC",
              title: "Project engagement",
              description: `Awarded via Open Projects: "${posting.title}"`,
              priceGbp: totalPriceGbp,
              deliveryDays,
              revisions: 1,
            },
          ],
        },
      },
      include: { packages: true },
    });

    const order = await tx.order.create({
      data: {
        gigId: gig.id,
        gigPackageId: gig.packages[0].id,
        clientId: posting.clientId,
        status: "PENDING_PAYMENT",
        totalPriceGbp,
        platformFeeGbp,
        milestones: { create: [{ title: "Full delivery", amountGbp: totalPriceGbp - platformFeeGbp }] },
      },
    });

    await tx.projectApplication.update({ where: { id: application.id }, data: { resultingOrderId: order.id } });
    await tx.projectPosting.update({
      where: { id: params.id },
      data: { status: "AWARDED", awardedApplicationId: application.id },
    });

    return { order };
  });

  await sendEmail({
    to: notifyEmail,
    subject: `You've been awarded: ${posting.title}`,
    body: `Congratulations — your proposal for "${posting.title}" was accepted. An order has been created for £${totalPriceGbp.toFixed(2)} — log in to review it and get started once the client pays.`,
  });
  await createNotification({
    userId: notifyUserId,
    type: "project",
    title: "You've been awarded the project",
    body: `"${posting.title}" — an order for £${totalPriceGbp.toFixed(2)} has been created.`,
    linkUrl: `/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}

export const POST = withErrorHandling(POSTHandler);
