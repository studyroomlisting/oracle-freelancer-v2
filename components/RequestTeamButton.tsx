"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RequestTeamButton({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit this request");
        return;
      }
      router.push(`/team-orders/${data.teamOrderId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button onClick={handleRequest} disabled={loading} className="btn-primary w-full">
        {loading ? "Submitting..." : "Request this team"}
      </button>
    </div>
  );
}
