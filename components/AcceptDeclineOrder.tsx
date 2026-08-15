"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptDeclineOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading("accept");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't accept this order");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function decline() {
    setLoading("decline");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/decline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't decline this order");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
      <p className="text-sm font-semibold text-neutral-900 mb-1">New order awaiting your response</p>
      <p className="text-xs text-neutral-600 mb-3">The client has paid — accept to start work, or decline if you can't take this on.</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {!declining ? (
        <div className="flex gap-2">
          <button onClick={accept} disabled={loading !== null} className="btn-primary py-2 px-4 text-sm">
            {loading === "accept" ? "Accepting..." : "Accept order"}
          </button>
          <button onClick={() => setDeclining(true)} disabled={loading !== null} className="btn-secondary py-2 px-4 text-sm">
            Decline
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600">Decline this order?</span>
          <button onClick={decline} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
            {loading === "decline" ? "Declining..." : "Yes, decline"}
          </button>
          <button onClick={() => setDeclining(false)} className="text-xs text-neutral-500 hover:underline">
            Never mind
          </button>
        </div>
      )}
    </div>
  );
}
