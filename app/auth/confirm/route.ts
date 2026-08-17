import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completeSupabaseAuth } from "@/lib/authCallbackShared";

// FIXED (real bug found during review): registering, then clicking
// "Confirm email address," landed on the login page — then logging in
// with the exact right password still failed with "Invalid email or
// password." What was actually happening: Supabase's default "Confirm
// signup" email template points the link at Supabase's OWN hosted
// `/auth/v1/verify` endpoint, which redirects back to this app with the
// tokens in the URL's hash fragment (`#access_token=...`) — a browser-only
// fragment that a server route (app/auth/callback/route.ts) can never see,
// since browsers never send it to the server at all. That route only
// understands a `?code=` query param (the PKCE flow OAuth/Google actually
// uses), so it fell through to "invalid-link" — but Supabase HAD already
// marked the email itself unconfirmed-or-inconsistent in a way that left
// signInWithPassword() rejecting the login afterward too.
//
// The fix is Supabase's own documented pattern for exactly this failure
// mode: verifyOtp() with a `token_hash` + `type`, both delivered as plain
// query params (not a fragment), so a server route CAN read them. This
// requires one change on the Supabase dashboard side (see the deploy
// notes) — the code side is this route.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const roleParam = searchParams.get("role");

  if (token_hash && type) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      return completeSupabaseAuth(data.user, type, roleParam, req);
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=invalid-link", req.url));
}
