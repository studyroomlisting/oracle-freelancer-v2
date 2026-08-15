import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// FIXED (Supabase Auth migration): this used to manually clear a custom
// cookie, with a documented ceiling — no real server-side revocation, a
// copied token would remain valid until its 30-day expiry regardless.
// supabase.auth.signOut() is real server-side revocation: it invalidates
// the refresh token on Supabase's own server, not just the local cookie,
// closing exactly the gap the old comment here used to flag as
// unaddressed.
async function POSTHandler(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url));
}

export const POST = withErrorHandling(POSTHandler);
