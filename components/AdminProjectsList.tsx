"use client";

import { useState } from "react";
import Link from "next/link";

export type AdminProject = {
  id: string;
  slug: string;
  title: string;
  status: string;
  categoryName: string;
  clientName: string;
  applicationCount: number;
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  OPEN: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  AWARDED: "bg-blue-100 text-blue-700",
  CLOSED: "bg-neutral-200 text-neutral-600",
};

export default function AdminProjectsList({ initialProjects }: { initialProjects: AdminProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteProject(id: string) {
    setPending(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete this project");
        setConfirmingId(null);
        return;
      }
      setProjects((list) => list.filter((p) => p.id !== id));
      setConfirmingId(null);
    } finally {
      setPending(null);
    }
  }

  if (projects.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No projects match this filter.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {error && <p className="text-xs text-red-600 p-3">{error}</p>}
      {projects.map((p) => (
        <div key={p.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href={`/projects/${p.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
              {p.title}
            </Link>
            <p className="text-xs text-neutral-500 mt-0.5">
              {p.clientName} · {p.categoryName} · {p.applicationCount} application{p.applicationCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusStyles[p.status] ?? "bg-neutral-100 text-neutral-600"}`}>
              {p.status.replace("_", " ")}
            </span>
            {confirmingId === p.id ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">Delete permanently?</span>
                <button
                  onClick={() => deleteProject(p.id)}
                  disabled={pending !== null}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  {pending === p.id ? "Deleting..." : "Yes"}
                </button>
                <button onClick={() => setConfirmingId(null)} className="text-xs text-neutral-500 hover:underline">
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingId(p.id)}
                disabled={pending !== null}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
