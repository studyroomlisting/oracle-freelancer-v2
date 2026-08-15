"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MyApplicationRow({
  projectSlug,
  projectId,
  applicationId,
  title,
  priceGbp,
  weeks,
  status,
  teamName,
}: {
  projectSlug: string;
  projectId: string;
  applicationId: string;
  title: string;
  priceGbp: number;
  weeks: number;
  status: string;
  teamName?: string;
}) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function withdraw() {
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/applications/${applicationId}/withdraw`, { method: "POST" });
      if (res.ok) {
        setCurrentStatus("WITHDRAWN");
        router.refresh();
      }
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="p-4 flex items-center justify-between">
      <Link href={`/projects/${projectSlug}`} className="hover:underline">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-900">{title}</p>
          {teamName && <span className="badge-certified">{teamName}</span>}
        </div>
        <p className="text-xs text-neutral-500">£{priceGbp.toLocaleString()} · {weeks} weeks</p>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="badge">{currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}</span>
        {currentStatus === "PENDING" && (
          <button onClick={withdraw} disabled={withdrawing} className="text-xs font-semibold text-red-600 hover:underline">
            {withdrawing ? "Withdrawing..." : "Withdraw"}
          </button>
        )}
      </div>
    </div>
  );
}
