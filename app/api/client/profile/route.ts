import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({
  companyName: z.string().max(200).optional(),
  companyIndustry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
});

async function PATCHHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) throw new ApiError("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new ApiError("Invalid input", 400);

  const updated = await prisma.user.update({
    where: { id: session.sub },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, companyName: updated.companyName });
}

export const PATCH = withErrorHandling(PATCHHandler);
