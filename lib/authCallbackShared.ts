import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

// Shared by app/auth/callback/route.ts (OAuth + PKCE `code` links) and
// app/auth/confirm/route.ts (the `token_hash`-based email-confirmation
// link — see that file for why a second route was needed). Both end up
// with the same real Supabase user and need the exact same next steps:
// create the profile row on a first-time OAuth login, send the welcome
// email once, and redirect to the right place. Pulled out so that logic
// only exists once — the two routes differ only in HOW they arrive at
// a verified Supabase user, not in what happens after.
// Shared by app/auth/callback/route.ts (OAuth + PKCE `code` links),
// app/auth/confirm/route.ts (the `token_hash`-based email-confirmation
// link), AND app/api/auth/verify-complete/route.ts (the client-side
// hash-fragment fallback — see app/auth/verify/page.tsx for why that
// third path exists). All three end up with the same real Supabase user
// and need the exact same next steps: create the profile row on a
// first-time OAuth login, send the welcome email once, and figure out
// where to send them. Split into a destination-resolving function (DB
// work, returns a path) and a thin redirect-wrapper around it, since the
// API-route caller needs the path as JSON, not a redirect response.
export async function resolveAuthDestination(
  supabaseUser: { id: string; email?: string | null; user_metadata: Record<string, unknown> | null },
  type: string | null,
  roleParam: string | null
): Promise<string> {
  if (type === "recovery") {
    return "/auth/reset-password";
  }

  let profile = await prisma.user.findUnique({ where: { id: supabaseUser.id } });

  if (!profile) {
    const metadata = supabaseUser.user_metadata as { full_name?: string; name?: string } | null;
    const fullName = metadata?.full_name || metadata?.name || supabaseUser.email?.split("@")[0] || "New user";
    const role = roleParam === "FREELANCER" ? "FREELANCER" : "CLIENT";

    profile = await prisma.user.create({
      data: { id: supabaseUser.id, email: supabaseUser.email ?? "", fullName, role },
    });

    if (role === "FREELANCER") {
      const { generateSlug } = await import("@/lib/slug");
      await prisma.freelancerProfile.create({
        data: { userId: profile.id, slug: generateSlug(fullName, profile.id.slice(-4)), headline: "", bio: "", oracleModules: "" },
      });
    }

    await sendEmail({ to: profile.email, ...emailTemplates.welcome({ fullName: profile.fullName, role: profile.role }) });
  } else if (type === "signup") {
    await sendEmail({ to: profile.email, ...emailTemplates.welcome({ fullName: profile.fullName, role: profile.role }) });
  }

  await prisma.user.update({ where: { id: profile.id }, data: { lastActiveAt: new Date() } });
  return profile.role !== "ADMIN" && !profile.onboardingCompletedAt
    ? "/onboarding"
    : profile.role === "FREELANCER"
      ? "/dashboard/freelancer"
      : profile.role === "ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/client";
}

export async function completeSupabaseAuth(
  supabaseUser: { id: string; email?: string | null; user_metadata: Record<string, unknown> | null },
  type: string | null,
  roleParam: string | null,
  req: NextRequest
): Promise<NextResponse> {
  const dest = await resolveAuthDestination(supabaseUser, type, roleParam);
  return NextResponse.redirect(new URL(dest, req.url));
}
