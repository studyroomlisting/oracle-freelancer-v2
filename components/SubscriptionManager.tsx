"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEAM_PRO_PRICE_GBP_PER_MONTH } from "@/lib/constants";

export default function SubscriptionManager({
  isActive,
  currentPeriodEnd,
}: {
  isActive: boolean;
  currentPeriodEnd: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start checkout");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't cancel");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 max-w-md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-neutral-900">Oracle Team Pro</p>
        {isActive && <span className="badge-certified">Active</span>}
      </div>
      <p className="text-2xl font-bold text-neutral-900 mb-1">£{TEAM_PRO_PRICE_GBP_PER_MONTH}<span className="text-sm font-normal text-neutral-500">/month</span></p>
      <ul className="text-sm text-neutral-600 flex flex-col gap-1.5 my-4">
        <li>✓ Lead unlimited teams</li>
        <li>✓ Team branding on your listings</li>
        <li>✓ Priority placement in Corporate Project Matching (coming soon)</li>
      </ul>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {isActive ? (
        <>
          {currentPeriodEnd && (
            <p className="text-xs text-neutral-500 mb-3">
              Renews {new Date(currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <button onClick={handleCancel} disabled={loading} className="btn-secondary w-full">
            {loading ? "Processing..." : "Cancel subscription"}
          </button>
        </>
      ) : (
        <button onClick={handleSubscribe} disabled={loading} className="btn-primary w-full">
          {loading ? "Processing..." : "Subscribe (simulated — Stripe not yet connected)"}
        </button>
      )}
    </div>
  );
}
