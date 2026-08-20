import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email().max(254) });

// FIXED (real bug found during review — third and final attempt, after
// two that didn't hold up):
//   1st attempt routed the link through /auth/callback, assuming
//      resetPasswordForEmail()'s PKCE code would exchange cleanly the
//      way Google OAuth's does — it didn't; the `code_verifier` cookie
//      set at request time apparently doesn't reliably survive until the
//      person actually clicks the email link.
//   2nd attempt tried flowType: "implicit" to sidestep PKCE entirely —
//      Supabase's own docs confirm Password Recovery unconditionally
//      uses PKCE server-side, so that setting had no effect; worse, that
//      attempt's no-op cookie adapter guaranteed the exchange would fail
//      100% of the time.
// Both attempts also inherited Supabase's own built-in email service's
// strict, easily-exhausted rate limit (a separate thing from the
// `rateLimit` call below, which only limits requests per IP against THIS
// route).
//
// This version sidesteps the whole problem: it asks Supabase's ADMIN API
// to generate a recovery link (no email sent by Supabase at all, so its
// rate limit and PKCE redirect chain are both out of the picture), pulls
// the token_hash out of that response, builds a link pointing at
// /auth/confirm (verifyOtp — no cookie/verifier dependency, already
// proven for signup confirmation), and sends it through this app's own
// email pipeline (sendEmail), the same one every other transactional
// email here already uses reliably.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  // Email-enumeration protection: always return the same response
  // regardless of whether the account exists. We check locally first
  // (cheap, no external call) purely to decide whether to bother calling
  // the admin API and sending an email — never to change the response.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
    });

    if (!error && data?.properties?.hashed_token) {
      const resetUrl = new URL("/auth/confirm", req.url);
      resetUrl.searchParams.set("token_hash", data.properties.hashed_token);
      resetUrl.searchParams.set("type", "recovery");

      await sendEmail({
        to: parsed.data.email,
        ...emailTemplates.passwordReset({ resetUrl: resetUrl.toString() }),
      });
    }
  }

  return NextResponse.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
}

export const POST = withErrorHandling(POSTHandler);
