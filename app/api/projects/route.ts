import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

const attachmentSchema = z.object({
  url: z.string().min(1),
  fileType: z.string().min(1),
  fileName: z.string().min(1),
});

// FIXED (Post Requirement expansion): all new fields below are optional —
// a requirement can still be posted with just title/description/budget,
// same as before. Nothing here changes the meaning of an existing field.
const schema = z.object({
  title: z.string().min(10, "Title should describe the project, e.g. 'Fusion Financials go-live support'"),
  description: z.string().min(30, "Add enough detail for freelancers to scope a fair proposal."),
  categoryId: z.string().min(1),
  budgetMinGbp: z.coerce.number().positive().optional(),
  budgetMaxGbp: z.coerce.number().positive().optional(),
  timelineWeeks: z.coerce.number().int().positive().optional(),
  saveAsDraft: z.boolean().optional(),
  businessProcess: z.string().max(200).optional(),
  subProcess: z.string().max(200).optional(),
  oracleVersion: z.string().max(100).optional(),
  environment: z.enum(["DEV", "TEST", "UAT", "PROD"]).optional(),
  errorCode: z.string().max(100).optional(),
  errorMessage: z.string().max(4000).optional(),
  stepsToReproduce: z.string().max(4000).optional(),
  expectedBehaviour: z.string().max(2000).optional(),
  actualBehaviour: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL", "BLOCKER"]).optional(),
  pricingType: z.enum(["FIXED", "HOURLY"]).optional(),
  tags: z.string().max(300).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
});

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid project details" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.budgetMinGbp && data.budgetMaxGbp && data.budgetMinGbp > data.budgetMaxGbp) {
    return NextResponse.json({ error: "Minimum budget can't be higher than maximum budget" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 });

  const slugBase = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const posting = await prisma.projectPosting.create({
    data: {
      slug,
      clientId: session.sub,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      budgetMinGbp: data.budgetMinGbp,
      budgetMaxGbp: data.budgetMaxGbp,
      timelineWeeks: data.timelineWeeks,
      status: data.saveAsDraft ? "DRAFT" : "PENDING_REVIEW",
      businessProcess: data.businessProcess,
      subProcess: data.subProcess,
      oracleVersion: data.oracleVersion,
      environment: data.environment,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      stepsToReproduce: data.stepsToReproduce,
      expectedBehaviour: data.expectedBehaviour,
      actualBehaviour: data.actualBehaviour,
      priority: data.priority,
      severity: data.severity,
      pricingType: data.pricingType,
      tags: data.tags,
      attachments: data.attachments && data.attachments.length > 0 ? { create: data.attachments } : undefined,
    },
  });

  // FIXED (real gap found during review): posting a requirement gave the
  // poster zero confirmation it was actually received, beyond the
  // on-screen redirect — no email, no in-app notification. Deliberately
  // only fires when genuinely submitted for review, not on a draft save,
  // matching how this app treats drafts as "not yet a real event"
  // everywhere else.
  if (posting.status === "PENDING_REVIEW") {
    const poster = await prisma.user.findUnique({ where: { id: session.sub } });
    if (poster) {
      await sendEmail({
        to: poster.email,
        subject: `Project submitted: ${posting.title}`,
        body: `Your project "${posting.title}" has been submitted and is awaiting admin approval — usually reviewed within 24 hours. You'll be notified as soon as it's live.`,
      });
    }
    await createNotification({
      userId: session.sub,
      type: "project",
      title: "Project submitted",
      body: `"${posting.title}" is awaiting admin approval.`,
      linkUrl: `/projects/${posting.slug}`,
    });
  }

  return NextResponse.json({ posting }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
