import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(5),
  issuer: z.string().min(2).default("Oracle"),
  credentialUrl: z.string().url().optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid certification" }, { status: 400 });
  }

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub }, include: { user: true } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  // isCertified stays false (or unchanged) until an admin verifies this —
  // see /api/admin/certifications/[id]/verify.
  const certification = await prisma.certification.create({
    data: {
      freelancerProfileId: profile.id,
      name: parsed.data.name,
      issuer: parsed.data.issuer,
      credentialUrl: parsed.data.credentialUrl,
      verifiedByAdmin: false,
    },
  });

  await sendEmail({ to: profile.user.email, ...emailTemplates.certificationSubmitted({ certName: parsed.data.name }) });
  await createNotification({
    userId: profile.userId,
    type: "certification",
    title: "Certification submitted",
    body: `"${parsed.data.name}" is awaiting admin verification.`,
    linkUrl: "/dashboard/freelancer/profile",
  });

  return NextResponse.json({ certification }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
