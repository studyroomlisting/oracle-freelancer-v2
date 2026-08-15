// FIXED (Milestone 16 gap): no audit log existed anywhere. Same
// non-blocking philosophy as createNotification() — a failed audit write
// shouldn't ever break the admin action it's recording, since the action
// itself (suspending a user, approving a gig) is the thing that actually
// matters; losing one log entry to a transient DB hiccup is a lesser
// problem than blocking real moderation work over it.
export async function createAuditLog(params: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.auditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details ?? null,
      },
    });
  } catch {
    // Non-blocking — see the reasoning above.
  }
}
