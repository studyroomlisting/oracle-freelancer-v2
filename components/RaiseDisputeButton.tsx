"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RaiseDisputeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't raise a dispute");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary inline-flex w-auto px-5 text-red-600 border-red-200">
        Raise a dispute
      </button>
    );
  }

  return (
    <div className="card p-4 w-full">
      <p className="text-sm font-semibold text-neutral-900 mb-2">What's the issue?</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <textarea className="input mb-2" placeholder="Describe the problem — an admin will review and resolve it." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading || !reason.trim()} className="btn-primary py-2 px-4 text-sm">
          {loading ? "Submitting..." : "Submit dispute"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-neutral-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
