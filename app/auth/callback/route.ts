import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail, emailTemplates } from "@/lib/email";

// FIXED (Supabase Auth migration): this one route now replaces three
// separate custom flows this app used to build and maintain by hand —
// email verification, magic-link consumption, and the password-recovery
// link — because Supabase's signup confirmation, signInWithOtp, and
// resetPasswordForEmail all redirect through the same kind of link
// (?code=... using the PKCE flow) that needs the same one exchange step.
//
// Worth being explicit about a real security question this raises, since
// an earlier phase of this project specifically fixed a GET-mutation bug
// where email security scanners (Microsoft Defender, Proofpoint, etc.)
// pre-fetching a link could silently burn a one-time token before the
// real user ever clicked it. This route IS a GET handler, and the
// `code` here genuinely is single-use — but PKCE ties the exchange to a
// `code_verifier` stored in a cookie on the SAME browser that initiated
// the flow (requesting the link in the first place). A scanner visiting
// this URL from a different machine/session has no way to have that
// cookie, so it cannot complete the exchange even though it can hit the
// endpoint — this is a materially different, safer mechanism than the
// old shared-secret-token model, not a reintroduction of the same bug.
// This is Supabase's own documented, standard pattern for Next.js, not
// something invented for this app.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "recovery" | "magiclink" | "invite" | etc. — absent entirely for OAuth
  const roleParam = searchParams.get("role"); // only present for a first-time OAuth sign-in, see OAuthButtons.tsx

  if (code) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", req.url));
      }

      let profile = await prisma.user.findUnique({ where: { id: data.user.id } });

      // FIXED (real gap, caught before it could affect a real user): OAuth
      // (Google/Apple) sign-in creates a genuine Supabase identity
      // automatically — but nothing else in this app ever creates the
      // matching profile row the way /api/auth/register does for
      // email/password signup. Without this, a first-time OAuth user
      // would land here successfully, then be permanently unable to use
      // the app at all: getServerSession() requires a profile row to
      // exist and returns null otherwise, on every single request,
      // forever. This is the one place a first-time OAuth login is ever
      // detectable, so it's the one place this can be fixed.
      if (!profile) {
        const metadata = data.user.user_metadata as { full_name?: string; name?: string } | null;
        const fullName = metadata?.full_name || metadata?.name || data.user.email?.split("@")[0] || "New user";
        const role = roleParam === "FREELANCER" ? "FREELANCER" : "CLIENT"; // defaults to CLIENT if the role wasn't specified — the safer of the two to default to, since it grants no seller-side capabilities

        profile = await prisma.user.create({
          data: { id: data.user.id, email: data.user.email ?? "", fullName, role },
        });

        if (role === "FREELANCER") {
          const { generateSlug } = await import("@/lib/slug");
          await prisma.freelancerProfile.create({
            data: { userId: profile.id, slug: generateSlug(fullName, profile.id.slice(-4)), headline: "", bio: "", oracleModules: "" },
          });
        }

        await sendEmail({ to: profile.email, ...emailTemplates.welcome({ fullName: profile.fullName, role: profile.role }) });
      } else if (type === "signup") {
        // First time an EMAIL/PASSWORD signup's confirmation completes —
        // the profile already exists (created at registration), this is
        // just the moment to send the welcome email for that path.
        await sendEmail({ to: profile.email, ...emailTemplates.welcome({ fullName: profile.fullName, role: profile.role }) });
      }

      await prisma.user.update({ where: { id: profile.id }, data: { lastActiveAt: new Date() } });
      const dest = profile.role !== "ADMIN" && !profile.onboardingCompletedAt
        ? "/onboarding"
        : profile.role === "FREELANCER"
          ? "/dashboard/freelancer"
          : profile.role === "ADMIN"
            ? "/dashboard/admin"
            : "/dashboard/client";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=invalid-link", req.url));
}
