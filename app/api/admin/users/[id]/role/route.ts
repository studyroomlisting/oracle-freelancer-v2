import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/slug";

const schema = z.object({ role: z.enum(["CLIENT", "FREELANCER"]) });

// FIXED (Milestone 16 gap): no role-assignment capability existed at all.
// Deliberately restricted to CLIENT <-> FREELANCER only — never ADMIN,
// which isn't a one-click toggle from a list page. Converting TO
// freelancer creates a blank profile, same as real registration.
// Converting AWAY FROM freelancer is only allowed with zero real
// activity (no gigs, no teams led) — otherwise it would orphan real
// content; suspend the account instead if it needs to stop operating.
async function POSTHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);
  if (params.id === session.sub) throw new ApiError("You can't change your own role", 400);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("A valid role is required", 400);

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { freelancerProfile: { include: { gigs: true, teamsLed: true } } },
  });
  if (!user) throw new ApiError("User not found", 404);
  if (user.role === "ADMIN") throw new ApiError("Admin roles can't be changed from here", 400);
  if (user.role === parsed.data.role) throw new ApiError(`This user is already a ${parsed.data.role.toLowerCase()}`, 409);

  if (parsed.data.role === "CLIENT" && user.freelancerProfile) {
    if (user.freelancerProfile.gigs.length > 0 || user.freelancerProfile.teamsLed.length > 0) {
      throw new ApiError("This freelancer has gigs or teams and can't be converted to a client", 409);
    }
    await prisma.$transaction([
      prisma.freelancerProfile.delete({ where: { id: user.freelancerProfile.id } }),
      prisma.user.update({ where: { id: user.id }, data: { role: "CLIENT" } }),
    ]);
  } else if (parsed.data.role === "FREELANCER") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: "FREELANCER" } }),
      prisma.freelancerProfile.create({
        data: { userId: user.id, slug: generateSlug(user.fullName), headline: "", bio: "", oracleModules: "" },
      }),
    ]);
  }

  await createAuditLog({
    adminUserId: session.sub,
    action: "user.role_change",
    targetType: "User",
    targetId: user.id,
    details: `${user.role} → ${parsed.data.role}`,
  });

  return NextResponse.json({ ok: true, role: parsed.data.role });
}

export const POST = withErrorHandling(POSTHandler);
