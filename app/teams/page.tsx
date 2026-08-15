import Link from "next/link";
import { getTeams } from "@/lib/queries";
import TeamCard from "@/components/TeamCard";
import Pagination from "@/components/Pagination";

export default async function TeamsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const { teams, totalPages } = await getTeams(page);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Oracle Project Teams</h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
            Full implementation teams — Solution Architect, functional consultants, technical/integration specialist,
            and a PM — for companies who need coordinated delivery without a big consultancy price tag.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/teams/recommend" className="btn-secondary">
            AI team recommender
          </Link>
          <Link href="/teams/build" className="btn-primary">
            Build your own team
          </Link>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500 mt-8">
          No teams available yet — check back soon, or build your own above.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {teams.map((t) => (
              <TeamCard
                key={t.slug}
                team={{
                  slug: t.slug,
                  name: t.name,
                  leaderName: t.members.find((m) => m.isLeader)?.name ?? t.members[0]?.name ?? "Unassigned",
                  memberCount: t.members.length,
                  dailyRateGbp: t.dailyRateGbp,
                  availableFromWeeks: t.availableFromWeeks,
                  estimatedWeeks: t.estimatedWeeks,
                  teamScore: t.teamScore,
                  projectsCompleted: t.projectsCompleted,
                }}
              />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/teams" searchParams={{}} />
        </>
      )}
    </div>
  );
}
