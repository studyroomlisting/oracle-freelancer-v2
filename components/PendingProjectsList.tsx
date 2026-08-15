"use client";

import { useState } from "react";

export type PendingProject = {
  id: string;
  title: string;
  categoryName: string;
  clientName: string;
};

export default function PendingProjectsList({ initialProjects }: { initialProjects: PendingProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function approve(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/projects/${id}/approve`, { method: "POST" });
      if (res.ok) setProjects((p) => p.filter((x) => x.id !== id));
    } finally {
      setPending(null);
    }
  }

  async function reject(id: string) {
    if (!reason.trim()) return;
    setPending(id);
    try {
      const res = await fetch(`/api/admin/projects/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setProjects((p) => p.filter((x) => x.id !== id));
        setRejectingId(null);
        setReason("");
      }
    } finally {
      setPending(null);
    }
  }

  if (projects.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">Nothing to review — all project postings are up to date.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {projects.map((p) => (
        <div key={p.id} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
              <p className="text-xs text-neutral-500">{p.clientName} · {p.categoryName}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => approve(p.id)} disabled={pending === p.id} className="btn-primary py-2 px-3 text-xs">
                Approve
              </button>
              <button
                onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                disabled={pending === p.id}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Reject
              </button>
            </div>
          </div>

          {rejectingId === p.id && (
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Reason for rejection (shown to the client)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button onClick={() => reject(p.id)} disabled={!reason.trim() || pending === p.id} className="btn-secondary text-xs shrink-0">
                Confirm
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
