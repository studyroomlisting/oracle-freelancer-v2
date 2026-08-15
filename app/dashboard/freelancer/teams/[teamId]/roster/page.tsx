import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RosterManager from "@/components/RosterManager";

export default async function TeamRosterPage({ params }: { params: { teamId: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Roster management requires a connected database.</p>
      </div>
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
    include: { teamLeader: true, members: { where: { status: "ACTIVE" }, include: { freelancerProfile: { include: { user: true } } } } },
  });
  if (!team) notFound();
  if (team.teamLeader.userId !== session.sub) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/freelancer" className="text-xs text-neutral-500 hover:underline">← Back to dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-1">Manage roster</h1>
      <p className="text-sm text-neutral-500 mb-8">{team.name}</p>
      <RosterManager
        teamId={team.id}
        initialMembers={team.members.map((m: any) => ({
          id: m.id,
          roleLabel: m.roleLabel,
          freelancerName: m.freelancerProfile.user.fullName,
          freelancerSlug: m.freelancerProfile.slug,
        }))}
      />
    </div>
  );
}
