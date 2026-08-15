import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function GETHandler(req: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date"); // "YYYY-MM-DD"
  const duration = Number(searchParams.get("duration") ?? "60");

  if (!dateParam || Number.isNaN(Date.parse(dateParam))) {
    return NextResponse.json({ error: "A valid ?date=YYYY-MM-DD is required" }, { status: 400 });
  }

  const profile = await prisma.freelancerProfile.findUnique({ where: { slug: params.slug } });
  if (!profile) return NextResponse.json({ error: "Freelancer not found" }, { status: 404 });

  const [y, m, d] = dateParam.split("-").map(Number);
  const dateOnly = new Date(Date.UTC(y, m - 1, d));

  const slots = await getAvailableSlots(profile.id, dateOnly, duration);

  return NextResponse.json({
    date: dateParam,
    slots: slots.map((s) => ({
      startMinuteUtc: s.startMinuteUtc,
      iso: new Date(dateOnly.getTime() + s.startMinuteUtc * 60_000).toISOString(),
      label: `${String(Math.floor(s.startMinuteUtc / 60)).padStart(2, "0")}:${String(s.startMinuteUtc % 60).padStart(2, "0")}`,
    })),
  });
}

export const GET = withErrorHandling(GETHandler);
