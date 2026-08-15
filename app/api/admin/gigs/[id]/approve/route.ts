import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createAuditLog } from "@/lib/audit";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Admin session required" }, { status: 403 });
  }

  const gig = await prisma.gig.update({
    where: { id: params.id },
    data: { status: "ACTIVE", reviewedAt: new Date(), rejectionReason: null },
    include: { freelancerProfile: { include: { user: true } } },
  });

  await sendEmail({
    to: gig.freelancerProfile.user.email,
    ...emailTemplates.gigApproved({ gigTitle: gig.title }),
  });
  await createNotification({
    userId: gig.freelancerProfile.userId,
    type: "gig",
    title: "Gig approved",
    body: `"${gig.title}" is now live.`,
    linkUrl: `/gigs/${gig.slug}`,
  });
  await createAuditLog({ adminUserId: session.sub, action: "gig.approve", targetType: "Gig", targetId: gig.id, details: gig.title });

  // FIXED (security review, High): this previously returned the raw `gig`
  // object, which — via the `include` above — carries the freelancer's
  // full User record, including `passwordHash` (a bcrypt hash), straight
  // into the JSON response body sent to the admin's browser. Reshaping to
  // only the fields the client actually needs closes the leak.
  return NextResponse.json({
    gig: { id: gig.id, slug: gig.slug, title: gig.title, status: gig.status },
  });
}

export const POST = withErrorHandling(POSTHandler);
