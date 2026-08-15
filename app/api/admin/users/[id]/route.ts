import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";

const editSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email().max(254),
});

// FIXED (Milestone 16 gap): no way to edit a user's basic details from
// the admin side existed — only suspend/unsuspend.
async function PATCHHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError("User not found", 404);

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  if (parsed.data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) throw new ApiError("Another user already has that email", 409);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { fullName: parsed.data.fullName, email: parsed.data.email },
  });

  await createAuditLog({
    adminUserId: session.sub,
    action: "user.update",
    targetType: "User",
    targetId: user.id,
    details: `${user.fullName} <${user.email}> → ${updated.fullName} <${updated.email}>`,
  });

  return NextResponse.json({ id: updated.id, fullName: updated.fullName, email: updated.email });
}

export const PATCH = withErrorHandling(PATCHHandler);

// FIXED (Milestone 16 gap): no user-deletion route existed. Only allowed
// when the account has no real activity — otherwise deleting them would
// orphan or destroy real order/gig/review/transaction history. An account
// with any history should be suspended instead (already reversible,
// doesn't destroy anything).
async function DELETEHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);
  if (params.id === session.sub) throw new ApiError("You can't delete your own account", 400);

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      freelancerProfile: { include: { gigs: true, teamsLed: true } },
      ordersAsClient: true,
      projectPostings: true,
    },
  });
  if (!user) throw new ApiError("User not found", 404);
  if (user.role === "ADMIN") throw new ApiError("Admin accounts can't be deleted from here", 400);

  // An order can only exist via a gig, so checking gigs (rather than a
  // direct orders relation, which FreelancerProfile doesn't have) already
  // covers "has this freelancer ever done any real business" correctly —
  // any gig, ordered against or not, is still real content worth
  // protecting from an accidental delete.
  const hasActivity =
    user.ordersAsClient.length > 0 ||
    user.projectPostings.length > 0 ||
    (user.freelancerProfile && (user.freelancerProfile.gigs.length > 0 || user.freelancerProfile.teamsLed.length > 0));

  if (hasActivity) {
    throw new ApiError("This account has real activity (orders, gigs, or projects) and can't be deleted — suspend it instead.", 409);
  }

  await prisma.user.delete({ where: { id: params.id } });
  await createAuditLog({ adminUserId: session.sub, action: "user.delete", targetType: "User", targetId: params.id, details: `Deleted ${user.email}` });

  return NextResponse.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETEHandler);
