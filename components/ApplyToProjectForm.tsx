"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LedTeam = { id: string; name: string };

export default function ApplyToProjectForm({ projectId, myLedTeams }: { projectId: string; myLedTeams: LedTeam[] }) {
  const router = useRouter();
  const [applyAs, setApplyAs] = useState<string>(""); // "" = myself, otherwise a teamId
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPriceGbp, setProposedPriceGbp] = useState("");
  const [proposedWeeks, setProposedWeeks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverLetter,
          proposedPriceGbp,
          proposedWeeks,
          ...(applyAs ? { teamId: applyAs } : {}),
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit your application");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <div className="card p-4 text-sm text-brand-700 bg-brand-50">Application submitted — the client will review it.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3">
      <p className="text-sm font-bold text-neutral-900">Apply to this project</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {myLedTeams.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-neutral-700 block mb-1">Apply as</label>
          <select className="input" value={applyAs} onChange={(e) => setApplyAs(e.target.value)}>
            <option value="">Myself (individual)</option>
            {myLedTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (team I lead)
              </option>
            ))}
          </select>
        </div>
      )}

      <textarea
        className="input min-h-[100px]"
        placeholder={applyAs ? "Describe your team's approach and relevant experience..." : "Briefly describe your approach and relevant experience..."}
        value={coverLetter}
        onChange={(e) => setCoverLetter(e.target.value)}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="number" min={1} className="input" placeholder={applyAs ? "Team price (£)" : "Your price (£)"} value={proposedPriceGbp} onChange={(e) => setProposedPriceGbp(e.target.value)} required />
        <input type="number" min={1} className="input" placeholder="Timeline (weeks)" value={proposedWeeks} onChange={(e) => setProposedWeeks(e.target.value)} required />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Submitting..." : "Submit proposal"}
      </button>
    </form>
  );
}
