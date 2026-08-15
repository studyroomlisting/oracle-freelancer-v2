import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";

async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: "Admin session required" }, { status: 403 });

  if (params.id === session.sub) throw new ApiError("You can't suspend your own account", 400);

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError("User not found", 404);
  if (user.role === "ADMIN") throw new ApiError("Admin accounts can't be suspended from here", 400);

  // FIXED (Supabase Auth migration): sessionsInvalidatedAt no longer
  // exists — getServerSession() now checks isSuspended fresh, via a real
  // DB lookup, on every single call (needed anyway to fetch role), which
  // already gives immediate revocation without needing a separate
  // timestamp-comparison mechanism.
  await prisma.user.update({ where: { id: params.id }, data: { isSuspended: true } });
  await sendEmail({ to: user.email, ...emailTemplates.accountSuspended() });
  await createAuditLog({ adminUserId: session.sub, action: "user.suspend", targetType: "User", targetId: user.id, details: `Suspended ${user.email}` });
  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
