"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProjectLifecycleActions({ projectId, status, applicationCount }: { projectId: string; status: string; applicationCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: string) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Couldn't ${action} this project`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function deleteProject() {
    setLoading("delete");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete this project");
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const canEdit = status === "DRAFT" || status === "PENDING_REVIEW" || status === "REJECTED" || (status === "OPEN" && applicationCount === 0);
  const canDelete = applicationCount === 0 && status !== "AWARDED" && status !== "CLOSED";

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {canEdit && (
          <Link href={`/dashboard/client/projects/${projectId}/edit`} className="text-xs font-semibold text-brand-700 hover:underline">
            Edit
          </Link>
        )}
        {status === "DRAFT" && (
          <button onClick={() => callAction("submit")} disabled={loading !== null} className="text-xs font-semibold text-brand-700 hover:underline">
            {loading === "submit" ? "Submitting..." : "Submit for review"}
          </button>
        )}
        {canDelete &&
          (!confirmingDelete ? (
            <button onClick={() => setConfirmingDelete(true)} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
              Delete
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xs text-neutral-600">Delete permanently?</span>
              <button onClick={deleteProject} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
                {loading === "delete" ? "Deleting..." : "Yes"}
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="text-xs text-neutral-500 hover:underline">
                No
              </button>
            </span>
          ))}
      </div>
    </div>
  );
}
