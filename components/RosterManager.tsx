"use client";

import { useState } from "react";

type Member = { id: string; roleLabel: string; freelancerName: string; freelancerSlug: string };
type Candidate = { slug: string; name: string; headline: string; ratingAvg: number; moduleOverlap: number };

export default function RosterManager({ teamId, initialMembers }: { teamId: string; initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [replacedRoleLabel, setReplacedRoleLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function requestReplacement(member: Member) {
    setError(null);
    setReplacingId(member.id);
    setCandidates([]);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${member.id}/replace`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't process replacement");
        return;
      }
      setMembers((m) => m.filter((x) => x.id !== member.id));
      setCandidates(data.candidates);
      setReplacedRoleLabel(data.replacedRoleLabel);
    } catch {
      setError("Network error — please try again.");
    }
  }

  async function addReplacement(candidateSlug: string) {
    setAdding(candidateSlug);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerSlug: candidateSlug, roleLabel: replacedRoleLabel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this member");
        return;
      }
      setAdded(candidateSlug);
      setCandidates([]);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div className="card divide-y divide-neutral-200">
        {members.map((m) => (
          <div key={m.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">{m.freelancerName}</p>
              <p className="text-xs text-neutral-500">{m.roleLabel}</p>
            </div>
            <button onClick={() => requestReplacement(m)} className="btn-secondary py-2 px-3 text-xs">
              Mark for replacement
            </button>
          </div>
        ))}
      </div>

      {candidates.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-neutral-900 mb-3">
            Replacement candidates for &ldquo;{replacedRoleLabel}&rdquo;
          </h2>
          <div className="card divide-y divide-neutral-200">
            {candidates.map((c) => (
              <div key={c.slug} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                  <p className="text-xs text-neutral-500">
                    {c.headline} · ★ {c.ratingAvg.toFixed(1)} · {c.moduleOverlap} module{c.moduleOverlap !== 1 ? "s" : ""} in common
                  </p>
                </div>
                {added === c.slug ? (
                  <span className="badge-certified">Added</span>
                ) : (
                  <button onClick={() => addReplacement(c.slug)} disabled={adding === c.slug} className="btn-primary py-2 px-3 text-xs">
                    {adding === c.slug ? "Adding..." : "Add to team"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
