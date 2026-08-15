import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

  const supabase = createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: new URL("/auth/reset-password", req.url).toString(),
  });

  return NextResponse.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
}

export const POST = withErrorHandling(POSTHandler);
