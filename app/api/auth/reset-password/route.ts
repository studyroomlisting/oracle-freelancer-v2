import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail, emailTemplates } from "@/lib/email";
import { ApiError } from "@/lib/api/errors";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const schema = z.object({ password: z.string().min(8).max(72) });

// FIXED (Supabase Auth migration): this used to receive a `token` string
// and look up a passwordResetToken field directly — that field, and the
// whole manual-token model, is gone. The new flow: clicking the reset
// link Supabase sent (see forgot-password/route.ts's redirectTo) lands
// the user on /auth/reset-password with a real, Supabase-established
// recovery session already active in their cookies — this route reads
// THAT session and calls supabase.auth.updateUser() on it, rather than
// validating a token this app generated itself.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid request", 400);

  const supabase = createServerSupabaseClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) {
    throw new ApiError("This reset link is invalid or has expired. Request a new one.", 400);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    throw new ApiError(error.message || "Couldn't update your password.", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: supabaseUser.id } });
  if (user) {
    // Resetting your password is also a reasonable moment to clear any
    // active account lockout (Phase 28) — you've just proven ownership.
    // Supabase's own password-update flow already invalidates other
    // active sessions on its end; no equivalent app-level flag is needed
    // anymore (see the schema's isSuspended comment for why a fresh
    // per-request check already covers this).
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    await sendEmail({ to: user.email, ...emailTemplates.passwordChanged() });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
