import Link from "next/link";

export default function ProfileCompletionCard({ percent, missing, editHref }: { percent: number; missing: string[]; editHref: string }) {
  if (percent >= 100) return null;

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-neutral-900">Profile {percent}% complete</p>
        <Link href={editHref} className="text-xs font-semibold text-brand-700 hover:underline">
          Complete it →
        </Link>
      </div>
      <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mb-2">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-neutral-500">Still missing: {missing.join(", ")}</p>
      )}
    </div>
  );
}
