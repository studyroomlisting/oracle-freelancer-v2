export type TrustScoreData = {
  ratingAvg: number;
  ratingCount: number;
  onTimeDeliveryRate: number;
  avgResponseMinutes: number;
  collaborationRating: number;
  projectsCompleted: number;
};

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours > 1 ? "s" : ""}`;
}

export default function TrustScoreCard({ data, compact }: { data: TrustScoreData; compact?: boolean }) {
  const rows = [
    { label: "Customer reviews", value: `${data.ratingAvg.toFixed(1)}/5 (${data.ratingCount})` },
    { label: "Projects completed", value: String(data.projectsCompleted) },
    { label: "On-time delivery", value: `${data.onTimeDeliveryRate.toFixed(0)}%` },
    { label: "Response time", value: formatResponseTime(data.avgResponseMinutes) },
    { label: "Collaboration rating", value: `${data.collaborationRating.toFixed(1)}/10` },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {rows.map((r) => (
          <span key={r.label}>
            {r.label}: <b className="text-neutral-800">{r.value}</b>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-3">Trust Score</p>
      <dl className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-sm">
            <dt className="text-neutral-500">{r.label}</dt>
            <dd className="font-semibold text-neutral-900">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
