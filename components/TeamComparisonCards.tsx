"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ComparisonOption } from "@/lib/teamRecommendation";

export default function TeamComparisonCards({ options }: { options: ComparisonOption[] }) {
  const router = useRouter();
  const [submittingLabel, setSubmittingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(option: ComparisonOption) {
    setSubmittingLabel(option.label);
    setError(null);
    try {
      const res = await fetch("/api/team-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customComposition: option.composition,
          estimatedWeeks: option.estimatedWeeks,
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
      setSubmittingLabel(null);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {options.map((o) => (
          <div key={o.label} className="card p-5 flex flex-col">
            <p className="text-sm font-bold text-neutral-900">{o.label}</p>
            <p className="text-xs text-neutral-500 mb-4">{o.tagline}</p>

            <p className="text-2xl font-bold text-neutral-900 mb-1">£{o.totalCostGbp.toLocaleString()}</p>
            <p className="text-xs text-neutral-500 mb-4">£{o.dailyRateGbp.toLocaleString()}/day · {o.estimatedWeeks} weeks</p>

            <p className="text-sm font-semibold text-brand-700 mb-4">Rating {o.rating.toFixed(1)}/10</p>

            <ul className="flex flex-col gap-1.5 mb-5 flex-1">
              {o.composition.map((c) => (
                <li key={c.role} className="text-xs text-neutral-600 flex justify-between">
                  <span>{c.role}</span>
                  <span className="font-medium text-neutral-800">{c.consultantName}</span>
                </li>
              ))}
            </ul>

            <button onClick={() => handleRequest(o)} disabled={submittingLabel === o.label} className="btn-primary w-full">
              {submittingLabel === o.label ? "Submitting..." : "Request this team"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
