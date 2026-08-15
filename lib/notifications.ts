import { prisma } from "@/lib/prisma";

// FIXED (Milestone 14 gap): "In-App" notifications never existed — every
// notification on this platform was email-only. This is the single
// creation path every in-app notification goes through, called alongside
// the existing sendEmail() calls at the same trigger points (not
// replacing them — a user should get both, same as most real platforms).
export type NotificationType = "order" | "payment" | "message" | "dispute" | "milestone" | "wallet" | "gig" | "team" | "project" | "certification" | "subscription" | "account";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl ?? null,
      },
    });
  } catch {
    // A failed in-app notification write shouldn't ever break the
    // triggering action (accepting an order, processing a payment, etc.)
    // — same non-blocking philosophy already used for sendEmail() calls
    // throughout this codebase.
  }
}
