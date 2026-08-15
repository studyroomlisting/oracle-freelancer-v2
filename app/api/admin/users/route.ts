import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/slug";
import { randomBytes } from "crypto";

const schema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email().max(254),
  role: z.enum(["CLIENT", "FREELANCER"]), // deliberately not ADMIN — creating a new admin account isn't a one-click action from this form
});

// FIXED (Milestone 16 gap; Supabase Auth migration): no admin-initiated
// user creation existed at all before Milestone 16 — only self-
// registration. This now creates a REAL Supabase Auth identity via the
// Admin API (requires the service-role key — see lib/supabase.ts's
// createServiceRoleSupabaseClient, never exposed to the browser), then
// links our own profile row to it, same as normal registration does.
// They're issued a random password and must use "Forgot password" to
// actually get in — there's no real email delivery to hand them a
// temporary one, and generating a guessable default would be a real
// security mistake.
async function POSTHandler(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) throw new ApiError("A user with that email already exists", 409);

  const randomPassword = randomBytes(24).toString("hex");
  const supabaseAdmin = createServiceRoleSupabaseClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: randomPassword,
    email_confirm: true, // admin-created accounts don't need the usual confirmation email
  });

  if (error || !data.user) {
    throw new ApiError(error?.message ?? "Couldn't create this user's login", 500);
  }

  const user = await prisma.user.create({
    data: {
      id: data.user.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      onboardingCompletedAt: new Date(),
      ...(parsed.data.role === "FREELANCER"
        ? {
            freelancerProfile: {
              create: {
                slug: generateSlug(parsed.data.fullName),
                headline: "",
                bio: "",
                oracleModules: "",
              },
            },
          }
        : {}),
    },
  });

  await createAuditLog({ adminUserId: session.sub, action: "user.create", targetType: "User", targetId: user.id, details: `Created ${user.email} as ${user.role}` });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);
