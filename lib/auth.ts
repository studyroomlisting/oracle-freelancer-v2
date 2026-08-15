import { randomBytes } from "crypto";

// FIXED (Supabase Auth migration): this entire file used to own identity
// directly — bcrypt password hashing, custom JWT signing/verification,
// custom magic-link/reset/verification tokens. All of that is now
// Supabase Auth's responsibility. What's left here is deliberately thin:
// read whatever session Supabase says exists, then layer this app's own
// authorization rules (role, suspension, lockout) on top of it. The CSRF
// helpers are unrelated to the auth provider and unchanged.

export const CSRF_COOKIE_NAME = "og_csrf";

export function generateCsrfToken(): string {
  return randomBytes(24).toString("hex");
}

export function verifyCsrfToken(formToken: string | null, cookieToken: string | undefined): boolean {
  return !!formToken && !!cookieToken && formToken === cookieToken;
}

export type Session = { sub: string; role: string };

// The one real session-reading path. Everything else in this file is a
// thin wrapper around this. Deliberately re-fetches the profile row (role,
// isSuspended, lockedUntil) on every single call rather than trusting
// anything cached in the Supabase token — that fresh-every-request check
// is what makes a suspension take effect immediately, not just on the
// suspended user's next login (see the schema's isSuspended comment for
// the full reasoning; this replaces the more complex sessionsInvalidatedAt
// mechanism from before this migration, which is now redundant).
async function getCurrentSession(): Promise<Session | null> {
  try {
    // Lazy imports so this file stays loadable by vitest without a real
    // Next.js request context or Prisma being generated — same reasoning
    // as lib/wallet.ts and lib/analytics.ts.
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = createServerSupabaseClient();
    // Deliberately getUser(), not getSession() — getSession() only reads
    // the local cookie without revalidating it; getUser() confirms the
    // token against Supabase's own server. The extra round-trip is worth
    // it for the authoritative check this function exists to provide.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { prisma } = await import("@/lib/prisma");
    const profile = await prisma.user.findUnique({ where: { id: user.id } });
    if (!profile) return null;
    if (profile.isSuspended) return null;
    if (profile.lockedUntil && profile.lockedUntil > new Date()) return null;

    return { sub: user.id, role: profile.role };
  } catch {
    return null;
  }
}

// FIXED (production review, Medium): every protected Server Component page
// calls this directly. Isolated here so there's exactly one place that
// owns the session-reading logic, instead of it being duplicated.
export async function getServerSession(): Promise<Session | null> {
  return getCurrentSession();
}

// Generic session reader for any route handler. The `_req` parameter is
// accepted (and intentionally unused) purely so the ~90 API routes built
// against the pre-Supabase signature don't need to change at all — Route
// Handlers can call next/headers' cookies() directly, the same as Server
// Components, so no request object is actually needed here anymore.
export async function getSession(_req?: unknown): Promise<Session | null> {
  return getCurrentSession();
}

// Route-handler guard: confirms the caller is an authenticated admin.
export async function requireAdminSession(_req?: unknown): Promise<Session | null> {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

// Route-handler guard for freelancer-only actions (e.g. creating a gig).
export async function requireFreelancerSession(_req?: unknown): Promise<Session | null> {
  const session = await getCurrentSession();
  if (!session || session.role !== "FREELANCER") return null;
  return session;
}

// Route-handler guard for any authenticated user. Ownership of the
// specific resource is checked separately by the caller.
export async function requireAnySession(_req?: unknown): Promise<Session | null> {
  return getCurrentSession();
}
