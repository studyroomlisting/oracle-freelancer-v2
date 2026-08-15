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
    options: { emailRedirectTo: new URL("/auth/callback", req.url).toString() },
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

  return NextResponse.redirect(new URL("/onboarding", req.url));
}

export const POST = withErrorHandling(POSTHandler);
