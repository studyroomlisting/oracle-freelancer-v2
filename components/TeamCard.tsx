import Link from "next/link";

export type TeamCardData = {
  slug: string;
  name: string;
  leaderName: string;
  memberCount: number;
  dailyRateGbp: number;
  availableFromWeeks: number;
  estimatedWeeks: number;
  teamScore: number;
  projectsCompleted: number;
};

export default function TeamCard({ team }: { team: TeamCardData }) {
  return (
    <Link href={`/teams/${team.slug}`} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-neutral-900">{team.name}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Led by {team.leaderName} · {team.memberCount} members</p>
        </div>
        <span className="badge-certified shrink-0">★ {team.teamScore.toFixed(1)}/10</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <span>✔ Available in {team.availableFromWeeks} week{team.availableFromWeeks !== 1 ? "s" : ""}</span>
        <span>⏱ {team.estimatedWeeks} weeks</span>
      </div>

      <hr className="border-neutral-200" />

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">{team.projectsCompleted} projects delivered</span>
        <div className="text-right">
          <p className="text-[11px] uppercase text-neutral-500">Team day rate</p>
          <p className="text-base font-bold text-neutral-900">£{team.dailyRateGbp.toLocaleString()}/day</p>
        </div>
      </div>
    </Link>
  );
}
