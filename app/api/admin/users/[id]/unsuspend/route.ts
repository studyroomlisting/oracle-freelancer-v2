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
  if (!session) return NextResponse.json({ error: "Admin session required" }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError("User not found", 404);

  await prisma.user.update({ where: { id: params.id }, data: { isSuspended: false } });
  await sendEmail({ to: user.email, ...emailTemplates.accountReinstated() });
  await createNotification({ userId: user.id, type: "order", title: "Account reinstated", body: "Your account has been reinstated — welcome back." });
  await createAuditLog({ adminUserId: session.sub, action: "user.unsuspend", targetType: "User", targetId: user.id, details: `Reinstated ${user.email}` });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
