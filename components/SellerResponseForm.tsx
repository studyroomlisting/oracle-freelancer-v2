"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// FIXED (real gap found during review): sellers had no way to respond to
// a review at all — this is the freelancer-facing half of that fix.
export default function SellerResponseForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/review/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit your response");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <textarea
        className="input min-h-[70px] text-sm"
        placeholder="Respond publicly to this review..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        minLength={5}
        maxLength={1000}
        required
      />
      <button type="submit" disabled={submitting} className="btn-secondary mt-2 text-xs px-4 py-1.5 w-auto">
        {submitting ? "Submitting..." : "Submit response"}
      </button>
    </form>
  );
}
