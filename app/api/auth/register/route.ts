import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CSRF_COOKIE_NAME, verifyCsrfToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { generateSlug } from "@/lib/slug";

const schema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  role: z.enum(["CLIENT", "FREELANCER"]),
});

// FIXED (Supabase Auth migration): this used to hash the password itself
// (bcrypt), generate its own 24-hour verification token, send a custom
// verification email, and sign its own 30-day JWT — all of that is now
// Supabase Auth's job. `supabase.auth.signUp()` creates the real identity,
// sends Supabase's own verification email (configure the email template
// and "Confirm email" setting in the Supabase dashboard — this app has no
// control over that email's content anymore), and — because
// createServerSupabaseClient()'s cookie adapter is already wired up (see
// lib/supabase.ts) — sets the session cookie itself; there's no manual
// `res.cookies.set(...)` needed here anymore.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many accounts created from this network. Try again later." }, { status: 429 });
  }

  const form = await req.formData();

  if (!verifyCsrfToken(form.get("csrfToken") as string | null, req.cookies.get(CSRF_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Your session expired — please reload the page and try again." }, { status: 403 });
  }

  const parsed = schema.safeParse({
    fullName: form.get("fullName"),
    email: form.get("email"),
    password: form.get("password"),
    role: form.get("role"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { fullName, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // FIXED (real bug found during review): pointed at /auth/verify
      // instead of /auth/callback — see that page for the full reason.
      // Short version: the default "Confirm signup" email always sends
      // the session back as a URL hash fragment, which only a
      // CLIENT-SIDE page can read; a server route like /auth/callback
      // never receives it at all. Editing the email template to avoid
      // this requires custom SMTP to be configured first (a Supabase
      // dashboard restriction, not something this codebase controls),
      // so this is the code-only fix that works with the default
      // template as-is.
      emailRedirectTo: new URL("/auth/verify", req.url).toString(),
      data: { full_name: fullName },
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Couldn't create your account" }, { status: 400 });
  }

  // The profile row's id must match Supabase's own auth user id — this is
  // what links "the real identity" to "this app's data about them."
  const user = await prisma.user.create({
    data: { id: data.user.id, fullName, email, role },
  });

  if (role === "FREELANCER") {
    await prisma.freelancerProfile.create({
      data: {
        userId: user.id,
        slug: generateSlug(fullName, user.id.slice(-4)),
        headline: "New Oracle freelancer",
        bio: "",
        oracleModules: "",
      },
    });
  }

  // FIXED (real gap found during review): this always redirected to
  // /onboarding, silently assuming signUp() had also logged the person
  // in. That's only true when Supabase's "Confirm email" project setting
  // is OFF — with it ON (the case here: the account sat as "waiting for
  // verification" in the Supabase dashboard), `data.session` is null and
  // no session cookie gets set. /onboarding then requires a session,
  // bounces to /auth/login, and the person lands there with zero
  // explanation of what happened or whether their account was even
  // created — indistinguishable from the registration having silently
  // failed. `data.session` tells us which case we're actually in.
  if (!data.session) {
    return NextResponse.redirect(new URL("/auth/login?registered=1", req.url));
  }

  return NextResponse.redirect(new URL("/onboarding", req.url));
}

export const POST = withErrorHandling(POSTHandler);
