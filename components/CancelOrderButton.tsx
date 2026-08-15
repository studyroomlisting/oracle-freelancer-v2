"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelOrderButton({ basePath, label = "Cancel order" }: { basePath: string; label?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/cancel`, { method: "POST" });
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

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-xs font-semibold text-red-600 hover:underline">
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <span className="text-xs text-neutral-600">Are you sure?</span>
      <button onClick={handleCancel} disabled={loading} className="text-xs font-semibold text-red-600 hover:underline">
        {loading ? "Cancelling..." : "Yes, cancel"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs text-neutral-500 hover:underline">
        Never mind
      </button>
    </div>
  );
}
