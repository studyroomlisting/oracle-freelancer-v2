import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completeSupabaseAuth } from "@/lib/authCallbackShared";

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
      return completeSupabaseAuth(data.user, type, roleParam, req);
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=invalid-link", req.url));
}
