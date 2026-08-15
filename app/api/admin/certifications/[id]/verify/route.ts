import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Admin session required" }, { status: 403 });
  }

  const cert = await prisma.certification.update({
    where: { id: params.id },
    data: { verifiedByAdmin: true },
  });

  // Once a freelancer has at least one verified certification, surface the
  // "Oracle Certified" badge on their public profile.
  const profile = await prisma.freelancerProfile.update({
    where: { id: cert.freelancerProfileId },
    data: { isCertified: true },
    include: { user: true },
  });

  await sendEmail({ to: profile.user.email, ...emailTemplates.certificationVerified({ certName: cert.name }) });
  await createNotification({
    userId: profile.userId,
    type: "certification",
    title: "Certification verified",
    body: `"${cert.name}" is now verified — your Oracle Certified badge is live.`,
    linkUrl: "/dashboard/freelancer/profile",
  });
  await createAuditLog({ adminUserId: session.sub, action: "certification.verify", targetType: "Certification", targetId: cert.id, details: cert.name });

  return NextResponse.json({ certification: cert });
}

export const POST = withErrorHandling(POSTHandler);
