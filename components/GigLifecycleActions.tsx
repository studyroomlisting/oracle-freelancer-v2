"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GigLifecycleActions({ gigId, status, isProjectEngagement }: { gigId: string; status: string; isProjectEngagement: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isProjectEngagement) return null; // these are system-generated, not freelancer-managed

  async function callAction(action: string, method: "POST" | "DELETE" = "POST") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${gigId}/${action}`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Couldn't ${action} this gig`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function deleteGig() {
    setLoading("delete");
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${gigId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete this gig");
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <Link href={`/dashboard/freelancer/gigs/${gigId}/edit`} className="text-xs font-semibold text-brand-700 hover:underline">
          Edit
        </Link>

        {status === "DRAFT" && (
          <button onClick={() => callAction("publish")} disabled={loading !== null} className="text-xs font-semibold text-brand-700 hover:underline">
            {loading === "publish" ? "Submitting..." : "Submit for review"}
          </button>
        )}
        {status === "PENDING_REVIEW" && (
          <button onClick={() => callAction("unpublish")} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
            {loading === "unpublish" ? "Withdrawing..." : "Withdraw"}
          </button>
        )}
        {(status === "ACTIVE" || status === "PAUSED") && (
          <button onClick={() => callAction(status === "ACTIVE" ? "pause" : "unpause")} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
            {loading === "pause" || loading === "unpause" ? "Saving..." : status === "ACTIVE" ? "Hide" : "Make visible"}
          </button>
        )}
        {["DRAFT", "PAUSED", "REJECTED"].includes(status) && (
          <button onClick={() => callAction("archive")} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
            {loading === "archive" ? "Archiving..." : "Archive"}
          </button>
        )}
        {status === "ARCHIVED" && (
          <button onClick={() => callAction("unarchive")} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
            {loading === "unarchive" ? "Restoring..." : "Restore"}
          </button>
        )}
        <button
          onClick={async () => {
            setLoading("duplicate");
            setError(null);
            try {
              const res = await fetch(`/api/gigs/${gigId}/duplicate`, { method: "POST" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? "Couldn't duplicate this gig");
                return;
              }
              router.push(`/dashboard/freelancer/gigs/${data.gig.id}/edit`);
            } finally {
              setLoading(null);
            }
          }}
          disabled={loading !== null}
          className="text-xs font-semibold text-neutral-600 hover:underline"
        >
          {loading === "duplicate" ? "Duplicating..." : "Duplicate"}
        </button>

        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
            Delete
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Delete permanently?</span>
            <button onClick={deleteGig} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
              {loading === "delete" ? "Deleting..." : "Yes"}
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-xs text-neutral-500 hover:underline">
              No
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
