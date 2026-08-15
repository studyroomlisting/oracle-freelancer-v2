"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalForm({ availableGbp }: { availableGbp: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/freelancer/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountGbp: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't process this withdrawal");
        return;
      }
      setSuccess(true);
      setAmount("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (availableGbp <= 0) {
    return <p className="text-xs text-neutral-500">Nothing available to withdraw yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 max-w-[160px]">
        <label className="text-xs text-neutral-600 block mb-1">Withdraw amount (£)</label>
        <input
          type="number"
          min={0.01}
          max={availableGbp}
          step="0.01"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary py-2 px-4 text-sm">
        {submitting ? "Processing..." : "Withdraw"}
      </button>
      {error && <p className="text-xs text-red-600 self-center">{error}</p>}
      {success && <p className="text-xs text-brand-700 self-center">Withdrawal completed.</p>}
    </form>
  );
}
