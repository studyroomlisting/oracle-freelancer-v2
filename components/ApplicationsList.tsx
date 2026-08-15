"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Application = {
  id: string;
  coverLetter: string;
  proposedPriceGbp: number;
  proposedWeeks: number;
  status: string;
  applicantName: string;
  applicantSlug: string | null;
  applicantHref: string;
  ratingAvg: number;
  isTeam: boolean;
};

export default function ApplicationsList({ projectId, initialApplications, canDecide }: { projectId: string; initialApplications: Application[]; canDecide: boolean }) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept(appId: string) {
    setPending(appId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/applications/${appId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't accept this application");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function reject(appId: string) {
    setPending(appId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/applications/${appId}/reject`, { method: "POST" });
      if (res.ok) {
        setApplications((apps) => apps.map((a) => (a.id === appId ? { ...a, status: "REJECTED" } : a)));
      }
    } finally {
      setPending(null);
    }
  }

  if (applications.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No applications yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {applications.map((a) => (
        <div key={a.id} className="card p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <a href={a.applicantHref} className="text-sm font-bold text-neutral-900 hover:underline">
                {a.applicantName}
              </a>
              <p className="text-xs text-neutral-500">
                {a.isTeam ? "Team Score" : "★"} {a.ratingAvg.toFixed(1)}
                {a.isTeam && <span className="badge-certified ml-2">Team application</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-neutral-900">£{a.proposedPriceGbp.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">{a.proposedWeeks} weeks</p>
            </div>
          </div>
          <p className="text-sm text-neutral-700 mb-3">{a.coverLetter}</p>
          {a.status === "PENDING" && canDecide ? (
            <div className="flex gap-2">
              <button onClick={() => accept(a.id)} disabled={pending === a.id} className="btn-primary py-2 px-3 text-xs">
                Accept & award
              </button>
              <button onClick={() => reject(a.id)} disabled={pending === a.id} className="btn-secondary py-2 px-3 text-xs">
                Reject
              </button>
            </div>
          ) : (
            <span className="badge">{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</span>
          )}
        </div>
      ))}
    </div>
  );
}
