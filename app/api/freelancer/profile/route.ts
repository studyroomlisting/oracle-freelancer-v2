import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z.object({
  headline: z.string().min(5).max(120),
  bio: z.string().min(20).max(2000),
  oracleModules: z.string().max(500),
  hourlyRateGbp: z.coerce.number().positive().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  isProfilePublic: z.boolean().optional(),
});

async function PATCHHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile data" }, { status: 400 });
  }

  const profile = await prisma.freelancerProfile.update({
    where: { userId: session.sub },
    data: parsed.data,
  });

  return NextResponse.json({ profile });
}

export const PATCH = withErrorHandling(PATCHHandler);
