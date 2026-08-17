import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CSRF_COOKIE_NAME, verifyCsrfToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { isAccountLocked, lockoutMinutesRemaining, shouldLockAccount, LOCKOUT_DURATION_MINUTES } from "@/lib/businessRules";

// FIXED (Supabase Auth migration): this used to hash-compare the password
// itself (with a timing-safety dummy hash for the "email doesn't exist"
// case) and sign its own JWT. Supabase's signInWithPassword() replaces
// both — including its own timing-safe handling of the "no such email"
// case (it returns the same generic "Invalid login credentials" error
// either way), which is Supabase's concern now, not this route's.
//
// The account-lockout logic below is genuinely app-specific and Supabase
// doesn't provide it — kept, checked before ever calling Supabase, and
// incremented on a Supabase sign-in failure the same way it was
// incremented on a local bcrypt failure before.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
  }

  const form = await req.formData();

  if (!verifyCsrfToken(form.get("csrfToken") as string | null, req.cookies.get(CSRF_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Your session expired — please reload the page and try again." }, { status: 403 });
  }

  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isSuspended) {
    return NextResponse.json({ error: "This account has been suspended. Contact support for details." }, { status: 403 });
  }

  if (user && isAccountLocked(user.lockedUntil)) {
    const minutes = lockoutMinutesRemaining(user.lockedUntil);
    return NextResponse.json(
      { error: `Too many failed attempts on this account. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 423 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // FIXED (real bug found during review): every Supabase sign-in error
    // — wrong password, AND "email not confirmed" — was collapsed into
    // the same generic "Invalid email or password" message. If the
    // confirmation link never actually completed (see app/auth/confirm),
    // this told the person their PASSWORD was wrong, when the real
    // problem was their email still isn't confirmed — sending them off
    // to retype a password that was correct all along.
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return NextResponse.json(
        { error: "Your email isn't verified yet. Check your inbox for the confirmation link, or use \"Forgot password?\" to get a new one sent." },
        { status: 401 }
      );
    }
    if (user) {
      // FIXED (milestone review, Medium — concurrency bug): atomic
      // `increment` at the database level, not a read-then-write in JS,
      // closes the lost-update race two simultaneous wrong-password
      // requests could otherwise cause.
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      if (shouldLockAccount(updatedUser.failedLoginAttempts)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000) },
        });
        return NextResponse.json(
          { error: `Too many failed attempts. This account is locked for ${LOCKOUT_DURATION_MINUTES} minutes.` },
          { status: 423 }
        );
      }
    }
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!user) {
    // A real Supabase identity exists but our own profile row doesn't —
    // shouldn't happen in normal operation (registration always creates
    // both together), but fail safely and clearly rather than silently
    // logging someone into a broken, profile-less account.
    return NextResponse.json({ error: "Your account setup is incomplete. Please contact support." }, { status: 500 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastActiveAt: new Date() },
  });

  // FIXED (real gap found during review): the "Remember me" checkbox this
  // comment used to explain away was removed from the page entirely —
  // it visually implied it controlled something ("stay logged in
  // longer"), but nothing ever read it once Supabase Auth took over
  // session management (Phase 69); a checkbox that promises behavior it
  // doesn't deliver is a real honesty problem, not harmless UI. Session
  // length is now genuinely controlled by your Supabase project's Auth
  // settings (JWT expiry, refresh token reuse), not a per-login toggle.
  const dest = user.role !== "ADMIN" && !user.onboardingCompletedAt
    ? "/onboarding"
    : user.role === "FREELANCER"
      ? "/dashboard/freelancer"
      : user.role === "ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/client";
  return NextResponse.redirect(new URL(dest, req.url));
}

export const POST = withErrorHandling(POSTHandler);
