import { isOnlineNow, formatLastSeen } from "@/lib/businessRules";

export default function OnlineStatusBadge({ lastActiveAt }: { lastActiveAt: string | Date | null }) {
  const date = lastActiveAt ? new Date(lastActiveAt) : null;
  if (isOnlineNow(date)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-brand-700">
        <span className="w-2 h-2 rounded-full bg-brand-500" />
        Online now
      </span>
    );
  }
  const lastSeen = formatLastSeen(date);
  if (!lastSeen) return null;
  return <span className="text-xs text-neutral-400">Last seen {lastSeen}</span>;
}
