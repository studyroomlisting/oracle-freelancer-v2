"use client";

import { useState } from "react";
import Link from "next/link";

export type DisputedOrder = {
  id: string;
  gigTitle: string;
  clientName: string;
  freelancerName: string;
  totalPriceGbp: number;
  disputeReason: string;
  raisedByName: string;
};

export default function DisputedOrdersList({ initialOrders }: { initialOrders: DisputedOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"REFUND" | "RELEASE" | "DISMISS">("REFUND");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string) {
    if (!notes.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/resolve-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          refundAmountGbp: resolution === "REFUND" && refundAmount ? refundAmount : undefined,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't resolve this dispute");
        return;
      }
      setOrders((o) => o.filter((x) => x.id !== id));
      setResolvingId(null);
      setNotes("");
      setRefundAmount("");
    } finally {
      setPending(false);
    }
  }

  if (orders.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No open disputes.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {orders.map((o) => (
        <div key={o.id} className="p-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <Link href={`/orders/${o.id}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                {o.gigTitle}
              </Link>
              <p className="text-xs text-neutral-500">
                {o.clientName} ↔ {o.freelancerName} · £{o.totalPriceGbp.toFixed(2)} · Raised by {o.raisedByName}
              </p>
            </div>
            <button onClick={() => setResolvingId(resolvingId === o.id ? null : o.id)} className="btn-secondary py-2 px-3 text-xs shrink-0">
              {resolvingId === o.id ? "Cancel" : "Resolve"}
            </button>
          </div>
          <p className="text-xs text-neutral-600 bg-neutral-50 rounded p-2 mb-2">{o.disputeReason}</p>

          {resolvingId === o.id && (
            <div className="flex flex-col gap-2 mt-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 flex-wrap">
                {(["REFUND", "RELEASE", "DISMISS"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={`text-xs px-3 py-1.5 rounded border ${resolution === r ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-700"}`}
                  >
                    {r === "REFUND" ? "Refund client" : r === "RELEASE" ? "Release to freelancer" : "Dismiss"}
                  </button>
                ))}
              </div>
              {resolution === "REFUND" && (
                <input
                  type="number"
                  min={0}
                  max={o.totalPriceGbp}
                  className="input text-xs"
                  placeholder={`Leave blank for full refund (£${o.totalPriceGbp.toFixed(2)})`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              )}
              <textarea className="input text-xs" placeholder="Resolution notes (sent to both parties)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button onClick={() => resolve(o.id)} disabled={pending || !notes.trim()} className="btn-primary py-2 px-3 text-xs self-start">
                {pending ? "Resolving..." : "Confirm resolution"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
