import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AvailabilityManager from "@/components/AvailabilityManager";

export default async function AvailabilityPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let weeklySlots: any[] = [];
  let exceptions: any[] = [];

  if (process.env.DATABASE_URL) {
    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } });
    if (profile) {
      [weeklySlots, exceptions] = await Promise.all([
        prisma.trainerAvailability.findMany({ where: { freelancerProfileId: profile.id }, orderBy: { dayOfWeek: "asc" } }),
        prisma.trainerAvailabilityException.findMany({ where: { freelancerProfileId: profile.id }, orderBy: { date: "asc" } }),
      ]);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Availability</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Used to avoid double-booking when you create workshops. Doesn't yet gate 1:1 consulting/training gig orders —
        see the README for what's wired up so far.
      </p>
      <AvailabilityManager
        initialSlots={weeklySlots.map((s) => ({ dayOfWeek: s.dayOfWeek, startMinuteUtc: s.startMinuteUtc, endMinuteUtc: s.endMinuteUtc }))}
        initialExceptions={exceptions.map((e) => ({ id: e.id, date: e.date.toISOString(), isAvailable: e.isAvailable, note: e.note }))}
      />
    </div>
  );
}
