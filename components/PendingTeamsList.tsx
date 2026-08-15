"use client";

import { useState } from "react";

export type PendingTeam = {
  id: string;
  name: string;
  leaderName: string;
  memberCount: number;
  dailyRateGbp: number;
};

export default function PendingTeamsList({ initialTeams }: { initialTeams: PendingTeam[] }) {
  const [teams, setTeams] = useState(initialTeams);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function approve(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/teams/${id}/approve`, { method: "POST" });
      if (res.ok) setTeams((t) => t.filter((x) => x.id !== id));
    } finally {
      setPending(null);
    }
  }

  async function reject(id: string) {
    if (!reason.trim()) return;
    setPending(id);
    try {
      const res = await fetch(`/api/admin/teams/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setTeams((t) => t.filter((x) => x.id !== id));
        setRejectingId(null);
        setReason("");
      }
    } finally {
      setPending(null);
    }
  }

  if (teams.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No teams awaiting review.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {teams.map((t) => (
        <div key={t.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
              <p className="text-xs text-neutral-500">
                Led by {t.leaderName} · {t.memberCount} members · £{t.dailyRateGbp.toLocaleString()}/day
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => approve(t.id)} disabled={pending === t.id} className="btn-primary py-2 px-3 text-xs">
                Approve
              </button>
              <button
                onClick={() => setRejectingId(rejectingId === t.id ? null : t.id)}
                disabled={pending === t.id}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Reject
              </button>
            </div>
          </div>

          {rejectingId === t.id && (
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Reason for rejection (shown to the team leader)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button onClick={() => reject(t.id)} disabled={!reason.trim() || pending === t.id} className="btn-secondary text-xs shrink-0">
                Confirm
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
