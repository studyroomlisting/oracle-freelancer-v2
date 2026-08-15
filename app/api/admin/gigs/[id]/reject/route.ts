import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({ reason: z.string().min(3) });

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Admin session required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const gig = await prisma.gig.update({
    where: { id: params.id },
    data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: parsed.data.reason },
    include: { freelancerProfile: { include: { user: true } } },
  });

  await sendEmail({
    to: gig.freelancerProfile.user.email,
    ...emailTemplates.gigRejected({ gigTitle: gig.title, reason: parsed.data.reason }),
  });
  await createNotification({
    userId: gig.freelancerProfile.userId,
    type: "gig",
    title: "Gig needs changes",
    body: `"${gig.title}" wasn't approved: ${parsed.data.reason}`,
    linkUrl: `/dashboard/freelancer/gigs/${gig.id}/edit`,
  });
  await createAuditLog({ adminUserId: session.sub, action: "gig.reject", targetType: "Gig", targetId: gig.id, details: parsed.data.reason });

  // FIXED (security review, High): same passwordHash-leak pattern as the
  // approve route — reshaping instead of returning the raw Prisma object.
  return NextResponse.json({
    gig: { id: gig.id, slug: gig.slug, title: gig.title, status: gig.status, rejectionReason: gig.rejectionReason },
  });
}

export const POST = withErrorHandling(POSTHandler);
