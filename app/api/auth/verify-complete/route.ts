import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthDestination } from "@/lib/authCallbackShared";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Called by app/auth/verify/page.tsx right after it calls
// supabase.auth.setSession() client-side (see that file for why this
// two-step, client-then-server dance exists — SMTP not being configured
// meant the email-template-based fix in app/auth/confirm wasn't usable).
// setSession() on the browser client persists the session to cookies, so
// by the time this request arrives, createServerSupabaseClient() can see
// the now-logged-in user from those same cookies.
async function POSTHandler(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const roleParam = searchParams.get("role");

  const redirectTo = await resolveAuthDestination(user, type, roleParam);
  return NextResponse.json({ redirectTo });
}

export const POST = withErrorHandling(POSTHandler);
