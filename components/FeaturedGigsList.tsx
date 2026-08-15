"use client";

import { useState } from "react";

export type ManageableGig = {
  id: string;
  title: string;
  gigType: string;
  categoryName: string;
  freelancerName: string;
  isFeatured: boolean;
};

export default function FeaturedGigsList({ initialGigs }: { initialGigs: ManageableGig[] }) {
  const [gigs, setGigs] = useState(initialGigs);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleFeatured(id: string) {
    setPending(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gigs/${id}/feature`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't update this gig");
        return;
      }
      setGigs((list) => list.map((g) => (g.id === id ? { ...g, isFeatured: data.isFeatured } : g)));
    } finally {
      setPending(null);
    }
  }

  if (gigs.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No active gigs to feature yet.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {error && <p className="text-xs text-red-600 p-3">{error}</p>}
      {gigs.map((g) => (
        <div key={g.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">{g.title}</p>
            <p className="text-xs text-neutral-500">
              {g.freelancerName} · {g.categoryName} · {g.gigType}
            </p>
          </div>
          <button
            onClick={() => toggleFeatured(g.id)}
            disabled={pending !== null}
            className={`text-xs font-semibold shrink-0 hover:underline ${g.isFeatured ? "text-neutral-600" : "text-brand-700"}`}
          >
            {pending === g.id ? "Saving..." : g.isFeatured ? "Remove from Featured" : "Add to Featured"}
          </button>
        </div>
      ))}
    </div>
  );
}
