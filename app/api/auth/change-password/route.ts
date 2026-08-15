import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAnySession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ password: z.string().min(8).max(72) });

// FIXED (real gap found during review): there was no way for an
// already-logged-in user to change their password at all — only the
// logged-out "forgot password" recovery flow worked. Same underlying
// mechanism as that flow (supabase.auth.updateUser() on the current
// session), just reachable without having to log out first.
async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "A valid password is required", 400);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) throw new ApiError(error.message || "Couldn't update your password.", 400);

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (user) {
    await sendEmail({ to: user.email, ...emailTemplates.passwordChanged() });
  }
  // FIXED (real gap found during review): unlike the logged-out
  // "forgot password" recovery flow (correctly email-only, since the
  // user may not be actively using the app at that moment), this route
  // only ever runs while genuinely logged in — an in-app notification
  // would actually be seen on their next dashboard visit, not just
  // whichever inbox they happen to check.
  await createNotification({
    userId: session.sub,
    type: "account",
    title: "Password changed",
    body: "Your password was changed successfully.",
  });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);
