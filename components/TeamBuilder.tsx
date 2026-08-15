"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateTeamEngagementTotal } from "@/lib/pricing";

type Consultant = { name: string; slug: string; dayRateGbp: number; isCertified: boolean; ratingAvg: number };
type RoleGroup = { role: string; consultants: Consultant[] };

export default function TeamBuilder({ roleCatalogue }: { roleCatalogue: RoleGroup[] }) {
  const router = useRouter();
  // Selection keyed by role -> chosen consultant slug (or null if unselected)
  const [selection, setSelection] = useState<Record<string, string | null>>(
    Object.fromEntries(roleCatalogue.map((g) => [g.role, null]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null)

  function toggleRole(role: string, consultantSlug: string) {
    setSelection((s) => ({ ...s, [role]: s[role] === consultantSlug ? null : consultantSlug }));
  }

  const selected = useMemo(() => {
    return roleCatalogue
      .map((g) => {
        const chosenSlug = selection[g.role];
        if (!chosenSlug) return null;
        const consultant = g.consultants.find((c) => c.slug === chosenSlug);
        return consultant ? { role: g.role, consultant } : null;
      })
      .filter((x): x is { role: string; consultant: Consultant } => x !== null);
  }, [selection, roleCatalogue]);

  const dailyRate = selected.reduce((sum, s) => sum + s.consultant.dayRateGbp, 0);
  // Simple heuristic: 6-week base scope, +1.5 weeks per role beyond the first two
  // (more specialists usually means more integration/coordination overhead).
  const estimatedWeeks = selected.length === 0 ? 0 : Math.round(6 + Math.max(0, selected.length - 2) * 1.5);
  const estimatedCost = calculateTeamEngagementTotal(dailyRate, estimatedWeeks);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/team-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customComposition: selected.map((s) => ({
            role: s.role,
            consultantSlug: s.consultant.slug,
            consultantName: s.consultant.name,
            dayRateGbp: s.consultant.dayRateGbp,
          })),
          estimatedWeeks,
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit this request");
        return;
      }
      router.push(`/team-orders/${data.teamOrderId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 flex flex-col gap-5">
        {roleCatalogue.map((g) => (
          <div key={g.role} className="card p-4">
            <p className="text-sm font-bold text-neutral-900 mb-3">{g.role}</p>
            <div className="flex flex-col gap-2">
              {g.consultants.map((c) => {
                const isChosen = selection[g.role] === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleRole(g.role, c.slug)}
                    className={`flex items-center justify-between text-left px-3 py-2.5 rounded border ${
                      isChosen ? "border-brand-500 bg-brand-50" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          isChosen ? "bg-brand-500 border-brand-500 text-white" : "border-neutral-300"
                        }`}
                      >
                        {isChosen ? "✓" : ""}
                      </span>
                      <span className="text-sm font-medium text-neutral-900">{c.name}</span>
                      {c.isCertified && <span className="badge-certified">✓ Certified</span>}
                      <span className="text-xs text-neutral-500">★ {c.ratingAvg.toFixed(1)}</span>
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">£{c.dayRateGbp}/day</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="card p-5 sticky top-24">
          <p className="text-sm font-bold text-neutral-900 mb-4">Your team</p>

          {selected.length === 0 ? (
            <p className="text-sm text-neutral-500 mb-4">Pick at least one role to see pricing.</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-4">
              {selected.map((s) => (
                <li key={s.role} className="flex justify-between text-sm">
                  <span className="text-neutral-600">{s.consultant.name}</span>
                  <span className="font-semibold text-neutral-900">£{s.consultant.dayRateGbp}/day</span>
                </li>
              ))}
            </ul>
          )}

          <hr className="border-neutral-200 mb-4" />

          <dl className="flex flex-col gap-2 text-sm mb-5">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Combined day rate</dt>
              <dd className="font-semibold text-neutral-900">£{dailyRate.toLocaleString()}/day</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Estimated duration</dt>
              <dd className="font-semibold text-neutral-900">{estimatedWeeks || "—"} {estimatedWeeks ? "weeks" : ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Estimated total cost</dt>
              <dd className="font-bold text-neutral-900">£{estimatedCost.toLocaleString()}</dd>
            </div>
          </dl>

          <button className="btn-primary w-full" disabled={selected.length === 0 || submitting} onClick={handleRequest}>
            {submitting ? "Submitting..." : "Request this custom team"}
          </button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <p className="text-[11px] text-neutral-500 mt-2 text-center">
            Duration is a rough estimate based on team size — a real quote follows a short scoping call.
          </p>
        </div>
      </div>
    </div>
  );
}
