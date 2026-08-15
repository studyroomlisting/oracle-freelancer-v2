import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

const editSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(30),
  categoryId: z.string().min(1),
  budgetMinGbp: z.coerce.number().positive().optional(),
  budgetMaxGbp: z.coerce.number().positive().optional(),
  timelineWeeks: z.coerce.number().int().positive().optional(),
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
});

// FIXED (Milestone 6 gap): no way to edit a posting at all previously.
// Freely editable while DRAFT/PENDING_REVIEW/REJECTED (nobody's proposed
// against it yet, or it was sent back). Once OPEN (live, publicly
// visible), only editable while it still has zero applications — changing
// scope after freelancers have proposed against the original brief isn't
// fair to them.
async function PATCHHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  const posting = await prisma.projectPosting.findUnique({
    where: { id: params.id },
    include: { _count: { select: { applications: true } }, client: true },
  });
  if (!posting) throw new ApiError("Project not found", 404);
  if (posting.clientId !== session.sub) throw new ApiError("You can only edit your own project posting", 403);
  if (posting.status === "AWARDED" || posting.status === "CLOSED") {
    throw new ApiError("This project can no longer be edited", 409);
  }
  if (posting.status === "OPEN" && posting._count.applications > 0) {
    throw new ApiError("This project already has applications and can't be edited — freelancers proposed against the current brief", 409);
  }

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  const data = parsed.data;

  if (data.budgetMinGbp && data.budgetMaxGbp && data.budgetMinGbp > data.budgetMaxGbp) {
    throw new ApiError("Minimum budget can't be higher than maximum budget", 400);
  }
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new ApiError("Selected category does not exist", 400);

  const updated = await prisma.projectPosting.update({
    where: { id: posting.id },
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      budgetMinGbp: data.budgetMinGbp,
      budgetMaxGbp: data.budgetMaxGbp,
      timelineWeeks: data.timelineWeeks,
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
    },
  });

  // FIXED (real gap found during review): editing a requirement never
  // triggered any notification at all — the update silently succeeded
  // with no confirmation trail. Notifies the requirement's own owner,
  // since editing is only ever allowed while there's no one else with a
  // real stake yet (zero applications, or not yet publicly visible) —
  // see the status/application-count checks above. Same non-blocking
  // in-app + email pattern used for every other event on this platform.
  await createNotification({
    userId: posting.clientId,
    type: "order",
    title: "Requirement updated",
    body: `Your requirement "${updated.title}" was updated successfully.`,
    linkUrl: `/projects/${updated.slug}`,
  });
  await sendEmail({
    to: posting.client.email,
    subject: `Requirement updated: ${updated.title}`,
    body: `Your requirement "${updated.title}" was updated successfully.`,
  });

  return NextResponse.json({ posting: updated });
}

export const PATCH = withErrorHandling(PATCHHandler);

// FIXED (Milestone 6 gap): no delete route existed. Only allowed with zero
// applications — otherwise it would destroy real proposal history.
async function DELETEHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  const posting = await prisma.projectPosting.findUnique({
    where: { id: params.id },
    include: { _count: { select: { applications: true } } },
  });
  if (!posting) throw new ApiError("Project not found", 404);
  if (posting.clientId !== session.sub) throw new ApiError("You can only delete your own project posting", 403);
  if (posting._count.applications > 0) {
    throw new ApiError("This project has applications and can't be deleted", 409);
  }

  await prisma.projectPosting.delete({ where: { id: posting.id } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
