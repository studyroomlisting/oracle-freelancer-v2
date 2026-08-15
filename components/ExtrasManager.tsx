"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Extra = { id: string; title: string; description: string; priceGbp: number; extraDeliveryDays: number | null };

export default function ExtrasManager({ gigId, items }: { gigId: string; items: Extra[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceGbp, setPriceGbp] = useState("");
  const [extraDeliveryDays, setExtraDeliveryDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addExtra(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${gigId}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priceGbp, extraDeliveryDays: extraDeliveryDays || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this extra");
        return;
      }
      setTitle("");
      setDescription("");
      setPriceGbp("");
      setExtraDeliveryDays("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteExtra(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/gigs/${gigId}/extras/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-800 mb-2">Extras (optional paid add-ons)</h2>
      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="card p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{item.title} · £{item.priceGbp.toFixed(2)}</p>
                <p className="text-xs text-neutral-500">{item.description}</p>
                {item.extraDeliveryDays && <p className="text-xs text-brand-700">{item.extraDeliveryDays} day(s) faster delivery</p>}
              </div>
              <button onClick={() => deleteExtra(item.id)} disabled={deletingId === item.id} className="text-xs font-semibold text-red-600 hover:underline shrink-0">
                {deletingId === item.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addExtra} className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-700">Add an extra</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input className="input" placeholder="e.g. Extra revision, Source files, Faster delivery" minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input min-h-[60px]" placeholder="What's included?" minLength={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min={1} max={100000} step="0.01" inputMode="decimal" className="input" placeholder="Price (£)" value={priceGbp} onChange={(e) => setPriceGbp(e.target.value)} required />
          <input type="number" min={1} step={1} inputMode="numeric" className="input" placeholder="Days faster (optional)" value={extraDeliveryDays} onChange={(e) => setExtraDeliveryDays(e.target.value)} />
        </div>
        <button type="submit" disabled={submitting} className="btn-secondary self-start">
          {submitting ? "Adding..." : "Add extra"}
        </button>
      </form>
    </div>
  );
}
