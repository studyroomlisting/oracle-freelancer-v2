import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z.object({ email: z.string().email().max(254) });

// FIXED (Supabase Auth migration): this used to generate its own 1-hour
// reset token and send a custom email. supabase.auth.resetPasswordForEmail()
// replaces both — Supabase sends its own reset email (its content/template
// is configured in the Supabase dashboard now, not this codebase) and
// manages the token's lifetime itself. The email-enumeration protection
// (always returning the same success response regardless of whether the
// account exists) is preserved — this route never reveals whether
// Supabase's call actually found an account, same as before.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  // FIXED (real bug found during review): pointing this at /auth/callback
  // relied on exchangeCodeForSession(code) — PKCE, which needs a
  // `code_verifier` cookie that was set on THIS request. That cookie has
  // a limited lifetime, and this flow is inherently delayed: the person
  // has to go check their email and click the link, which can easily
  // take longer than the cookie survives — causing the exchange to fail
  // and silently dumping them on /auth/login with no explanation, even
  // though the link itself was genuine and not actually expired.
  //
  // Fix: request Supabase's IMPLICIT flow for this specific call instead
  // of PKCE. An implicit-flow link carries the session directly in the
  // URL's hash fragment when clicked — nothing stored ahead of time to
  // expire, so it doesn't matter how long the person takes to check
  // their email. app/auth/verify/page.tsx already has a client-side
  // handler for exactly this hash-fragment case (built for the
  // no-custom-SMTP situation) — this now actually reaches it, instead of
  // handing off to the PKCE-only /auth/callback route.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => [], setAll: () => {} }, auth: { flowType: "implicit" } }
  );
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: new URL("/auth/verify", req.url).toString(),
  });

  // FIXED (real bug found during review): the result of
  // resetPasswordForEmail() was thrown away entirely — this always
  // returned the same generic success message no matter what Supabase
  // actually did, including when Supabase itself rejected the request
  // with a 429 "email rate limit exceeded" (its OWN built-in email
  // service has a strict per-project quota, separate from the `rateLimit`
  // check above, which only limits requests per IP against THIS route).
  // The generic message exists to avoid confirming whether a given email
  // is registered — but a project-wide send-quota error doesn't depend
  // on which email was submitted at all, so surfacing it plainly here
  // leaks nothing about any specific account, while silently hiding it
  // left the person with no way to tell "genuinely sent" apart from
  // "nothing is coming, and won't, until the quota resets."
  const isRateLimited =
    error?.status === 429 ||
    error?.code === "over_email_send_rate_limit" ||
    (error?.message ?? "").toLowerCase().includes("rate limit");
  if (isRateLimited) {
    return NextResponse.json(
      { error: "Too many reset emails have been sent from this project recently. Please wait a while and try again." },
      { status: 429 }
    );
  }

  return NextResponse.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
}

export const POST = withErrorHandling(POSTHandler);
