"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// FIXED (real gap found during review): the only feedback after a
// successful payment used to be a silent router.refresh() — the status
// badge does change (PENDING_PAYMENT → PENDING_ACCEPTANCE) and the Pay
// button disappears, but neither is an explicit confirmation a buyer
// would clearly notice at the actual moment of payment. Uses the same
// ?created=1-style success-banner pattern already established elsewhere
// in this app (see the freelancer dashboard's gig-submission banner).
export default function PayNowButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateFailure }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return;
      }
      router.push(`${pathname}?paid=1`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button onClick={handlePay} disabled={loading} className="btn-primary w-full">
        {loading ? "Processing..." : "Pay now (simulated — Stripe not yet connected)"}
      </button>
      {/* Test-only affordance — payments are entirely simulated here (no
          real Stripe connection exists yet), so this is how a declined
          payment can actually be exercised end-to-end without one. */}
      <label className="flex items-center gap-2 text-xs text-neutral-400 mt-2">
        <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} className="rounded border-neutral-300" />
        Simulate a declined payment (testing only)
      </label>
    </div>
  );
}
