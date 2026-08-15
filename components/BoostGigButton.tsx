"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "7", label: "7 days — £15" },
  { value: "14", label: "14 days — £25" },
  { value: "30", label: "30 days — £45" },
];

// FIXED (real gap found during review): "Featured" was entirely
// admin-curated with no self-service path — this is that path.
export default function BoostGigButton({ gigId, boostedUntil }: { gigId: string; boostedUntil: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentlyBoosted = boostedUntil && new Date(boostedUntil) > new Date();

  async function handleBoost() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${gigId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't purchase this boost");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-brand-700 hover:underline">
        {isCurrentlyBoosted
          ? `Featured until ${new Date(boostedUntil!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — extend`
          : "⭐ Feature this gig"}
      </button>
    );
  }

  return (
    <div className="text-right">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input text-xs py-1 mb-1">
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:underline">
          Cancel
        </button>
        <button onClick={handleBoost} disabled={loading} className="text-xs font-semibold text-brand-700 hover:underline">
          {loading ? "Purchasing..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}
