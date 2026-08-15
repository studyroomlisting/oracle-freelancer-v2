import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const posting = await prisma.projectPosting.findUnique({ where: { id: params.id }, include: { client: true } });
  if (!posting) throw new ApiError("Project not found", 404);
  if (posting.status !== "PENDING_REVIEW") throw new ApiError("This project isn't awaiting review", 409);

  const updated = await prisma.projectPosting.update({
    where: { id: posting.id },
    data: { status: "OPEN", rejectionReason: null },
  });

  await sendEmail({ to: posting.client.email, ...emailTemplates.projectApproved({ projectTitle: posting.title }) });
  await createNotification({
    userId: posting.clientId,
    type: "project",
    title: "Project approved",
    body: `"${posting.title}" is now visible to freelancers.`,
    linkUrl: `/projects/${posting.slug}`,
  });
  await createAuditLog({ adminUserId: session.sub, action: "project.approve", targetType: "ProjectPosting", targetId: posting.id, details: posting.title });

  return NextResponse.json({ posting: { id: updated.id, status: updated.status } });
}

export const POST = withErrorHandling(POSTHandler);
