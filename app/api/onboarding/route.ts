import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  finish: z.boolean(),
  // Freelancer fields
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  oracleModules: z.string().max(500).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  hourlyRateGbp: z.coerce.number().positive().optional(),
  // Client fields
  companyName: z.string().max(200).optional(),
  companyIndustry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
});

// FIXED (Milestone 2 gap): registration previously dropped every new user
// straight onto their dashboard with a bare, empty profile — no guided
// setup at all. This is the save endpoint behind /app/onboarding — called
// on every "Save & Continue" (partial, draft-like — no field is required
// here) and again on "Finish"/"Skip for now" (which also stamps
// onboardingCompletedAt). There's no separate draft-storage model: saving
// partial fields directly onto the real profile *is* the draft state —
// returning to /onboarding later just shows whatever was already saved.
async function PATCHHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  const data = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) throw new ApiError("User not found", 404);
  if (user.role === "ADMIN") throw new ApiError("Admins don't have an onboarding flow", 400);

  if (user.role === "FREELANCER") {
    await prisma.freelancerProfile.update({
      where: { userId: session.sub },
      data: {
        ...(data.headline !== undefined ? { headline: data.headline } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.oracleModules !== undefined ? { oracleModules: data.oracleModules } : {}),
        ...(data.yearsExperience !== undefined ? { yearsExperience: data.yearsExperience } : {}),
        ...(data.hourlyRateGbp !== undefined ? { hourlyRateGbp: data.hourlyRateGbp } : {}),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: session.sub },
      data: {
        ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
        ...(data.companyIndustry !== undefined ? { companyIndustry: data.companyIndustry } : {}),
        ...(data.companySize !== undefined ? { companySize: data.companySize } : {}),
      },
    });
  }

  if (data.finish) {
    await prisma.user.update({ where: { id: session.sub }, data: { onboardingCompletedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}

export const PATCH = withErrorHandling(PATCHHandler);
