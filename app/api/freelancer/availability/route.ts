import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const weeklySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinuteUtc: z.number().int().min(0).max(1439),
  endMinuteUtc: z.number().int().min(1).max(1440),
});

const putSchema = z.object({
  weeklySlots: z.array(weeklySlotSchema).max(20),
});

const exceptionSchema = z.object({
  date: z.string().min(1), // ISO date, e.g. "2026-08-12"
  isAvailable: z.boolean().default(false),
  note: z.string().max(200).optional(),
});

async function GETHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  const [weeklySlots, exceptions] = await Promise.all([
    prisma.trainerAvailability.findMany({ where: { freelancerProfileId: profile.id }, orderBy: { dayOfWeek: "asc" } }),
    prisma.trainerAvailabilityException.findMany({ where: { freelancerProfileId: profile.id }, orderBy: { date: "asc" } }),
  ]);

  return NextResponse.json({ weeklySlots, exceptions });
}

// Replaces the entire weekly schedule in one call — simpler and less
// error-prone than diffing individual slot edits for an MVP settings page.
async function PUTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });

  for (const slot of parsed.data.weeklySlots) {
    if (slot.endMinuteUtc <= slot.startMinuteUtc) {
      return NextResponse.json({ error: "Each slot's end time must be after its start time" }, { status: 400 });
    }
  }

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  await prisma.$transaction([
    prisma.trainerAvailability.deleteMany({ where: { freelancerProfileId: profile.id } }),
    prisma.trainerAvailability.createMany({
      data: parsed.data.weeklySlots.map((s) => ({ ...s, freelancerProfileId: profile.id })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}

// Adds a single exception (e.g. "block 2026-08-25, I'm on holiday").
async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "Freelancer session required" }, { status: 403 });

  const parsed = exceptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exception" }, { status: 400 });

  const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
  if (!profile) return NextResponse.json({ error: "No freelancer profile found" }, { status: 404 });

  const exception = await prisma.trainerAvailabilityException.create({
    data: {
      freelancerProfileId: profile.id,
      date: new Date(parsed.data.date),
      isAvailable: parsed.data.isAvailable,
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ exception }, { status: 201 });
}

export const GET = withErrorHandling(GETHandler);
export const PUT = withErrorHandling(PUTHandler);
export const POST = withErrorHandling(POSTHandler);
