import { getTeam } from "@/lib/queries";
import { getServerSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import TrustScoreCard from "@/components/TrustScoreCard";
import RequestTeamButton from "@/components/RequestTeamButton";
import { calculateTeamEngagementTotal } from "@/lib/pricing";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const team = await getTeam(params.slug);
  if (!team) return { title: "Team not found — OracleGigs" };
  const description = team.description.slice(0, 155);
  return {
    title: `${team.name} — OracleGigs`,
    description,
    openGraph: { title: team.name, description, type: "website" },
  };
}

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const team = await getTeam(params.slug);
  if (!team) notFound();

  // FIXED (Milestone 18 security review, real vulnerability, currently
  // live): same "leaked non-public listing" class already found and fixed
  // this same pass for the gig detail page — a PENDING_REVIEW or REJECTED
  // team was fully visible to anyone who knew or guessed its slug. The
  // data needed for this gate (status, leader's userId) didn't even exist
  // on NormalizedTeam before this fix — extended it rather than guess
  // around the gap.
  const session = await getServerSession();
  const isOwner = session?.sub === team.teamLeaderUserId;
  if (team.status !== "ACTIVE" && !isOwner) {
    notFound();
  }

  const leader = team.members.find((m) => m.isLeader) ?? team.members[0];
  const others = team.members.filter((m) => m !== leader);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <div>
          <div className="text-xs text-neutral-500 mb-2">
            <Link href="/teams" className="hover:underline">Oracle Project Teams</Link>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{team.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            <span className="badge-certified">★ {team.teamScore.toFixed(1)}/10 Team Score</span>
            <span>{team.projectsCompleted} projects delivered</span>
            <span>£{(team.budgetDeliveredGbp / 1_000_000).toFixed(1)}M budget delivered</span>
            <span>{team.successRate.toFixed(0)}% success rate</span>
          </div>
        </div>

        <p className="text-sm text-neutral-700 leading-relaxed">{team.description}</p>

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Team roster</h2>
          <div className="flex flex-col gap-4">
            <div className="card p-4 border-l-4 border-l-brand-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center font-semibold overflow-hidden">
                  {leader.avatarUrl ? (
                    <img src={leader.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    leader.name.charAt(0)
                  )}
                </div>
                <div>
                  <Link href={`/freelancers/${leader.slug}`} className="text-sm font-bold text-neutral-900 hover:underline">
                    {leader.name}
                  </Link>
                  <p className="text-xs text-brand-700 font-semibold">{leader.roleLabel}</p>
                </div>
                {leader.isCertified && <span className="badge-certified ml-auto">✓ Oracle Certified</span>}
              </div>
              <TrustScoreCard
                compact
                data={{
                  ratingAvg: leader.ratingAvg,
                  ratingCount: leader.ratingCount,
                  onTimeDeliveryRate: leader.onTimeDeliveryRate,
                  avgResponseMinutes: leader.avgResponseMinutes,
                  collaborationRating: leader.collaborationRating,
                  projectsCompleted: leader.projectsCompleted,
                }}
              />
            </div>

            {others.map((m) => (
              <div key={m.slug + m.roleLabel} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-semibold overflow-hidden">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <Link href={`/freelancers/${m.slug}`} className="text-sm font-bold text-neutral-900 hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-neutral-500">{m.roleLabel}</p>
                  </div>
                  {m.isCertified && <span className="badge-certified ml-auto">✓ Oracle Certified</span>}
                </div>
                <TrustScoreCard
                  compact
                  data={{
                    ratingAvg: m.ratingAvg,
                    ratingCount: m.ratingCount,
                    onTimeDeliveryRate: m.onTimeDeliveryRate,
                    avgResponseMinutes: m.avgResponseMinutes,
                    collaborationRating: m.collaborationRating,
                    projectsCompleted: m.projectsCompleted,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="card p-5 sticky top-24">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-bold text-neutral-900">Team day rate</span>
            <span className="text-xl font-bold text-neutral-900">£{team.dailyRateGbp.toLocaleString()}</span>
          </div>
          <p className="text-xs text-neutral-500 mb-4">Whole team, per day</p>

          <dl className="flex flex-col gap-2 text-sm mb-5">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Available in</dt>
              <dd className="font-semibold text-neutral-900">{team.availableFromWeeks} week{team.availableFromWeeks !== 1 ? "s" : ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Estimated duration</dt>
              <dd className="font-semibold text-neutral-900">{team.estimatedWeeks} weeks</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Estimated total</dt>
              <dd className="font-semibold text-neutral-900">
                £{(calculateTeamEngagementTotal(team.dailyRateGbp, team.estimatedWeeks)).toLocaleString()}
              </dd>
            </div>
          </dl>

          <RequestTeamButton teamId={team.id} />
          <p className="text-[11px] text-neutral-500 mt-2 text-center">
            This submits a request — pricing is confirmed after a short scoping call before any payment.
          </p>
        </div>
      </div>
    </div>
  );
}
