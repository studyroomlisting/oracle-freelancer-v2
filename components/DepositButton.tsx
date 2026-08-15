"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositButton({ teamOrderId }: { teamOrderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team-orders/${teamOrderId}/deposit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button onClick={handlePay} disabled={loading} className="btn-primary w-full">
        {loading ? "Processing..." : "Pay deposit (simulated — Stripe not yet connected)"}
      </button>
    </div>
  );
}
