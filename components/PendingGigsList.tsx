"use client";

import { useState } from "react";

export type PendingGig = {
  id: string;
  title: string;
  gigType: string;
  categoryName: string;
  freelancerName: string;
  createdAt: string;
};

export default function PendingGigsList({ initialGigs }: { initialGigs: PendingGig[] }) {
  const [gigs, setGigs] = useState(initialGigs);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function approve(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/gigs/${id}/approve`, { method: "POST" });
      if (res.ok) setGigs((g) => g.filter((x) => x.id !== id));
    } finally {
      setPending(null);
    }
  }

  async function reject(id: string) {
    if (!reason.trim()) return;
    setPending(id);
    try {
      const res = await fetch(`/api/admin/gigs/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setGigs((g) => g.filter((x) => x.id !== id));
        setRejectingId(null);
        setReason("");
      }
    } finally {
      setPending(null);
    }
  }

  if (gigs.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">Nothing to review — all gigs are up to date.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {gigs.map((g) => (
        <div key={g.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{g.title}</p>
              <p className="text-xs text-neutral-500">
                {g.freelancerName} · {g.categoryName} · {g.gigType.charAt(0) + g.gigType.slice(1).toLowerCase()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => approve(g.id)}
                disabled={pending === g.id}
                className="btn-primary py-2 px-3 text-xs"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectingId(rejectingId === g.id ? null : g.id)}
                disabled={pending === g.id}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Reject
              </button>
            </div>
          </div>

          {rejectingId === g.id && (
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Reason for rejection (shown to the freelancer)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button onClick={() => reject(g.id)} disabled={!reason.trim() || pending === g.id} className="btn-secondary text-xs shrink-0">
                Confirm
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
