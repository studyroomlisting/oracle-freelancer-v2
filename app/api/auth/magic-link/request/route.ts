import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z.object({ email: z.string().email().max(254) });

// FIXED (Supabase Auth migration): this used to generate its own 15-minute
// token and send a custom email. supabase.auth.signInWithOtp() replaces
// both — Supabase sends its own magic-link email (template configured in
// the Supabase dashboard, not lib/email.ts anymore) and manages the
// link's lifetime itself. Same email-enumeration-safe pattern preserved
// (always the same success response) — and the isSuspended check still
// happens here, before ever calling Supabase, since Supabase has no
// concept of this app's suspension flag.
async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`magic-link:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.isSuspended) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: new URL("/auth/callback", req.url).toString() },
    });
  }

  return NextResponse.json({ ok: true, message: "If that email is registered, a sign-in link has been sent." });
}

export const POST = withErrorHandling(POSTHandler);
