"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RescheduleButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTime) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date(newTime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't reschedule");
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
        Reschedule
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input type="datetime-local" className="input" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
      <button type="submit" disabled={loading} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
        {loading ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:underline">
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
