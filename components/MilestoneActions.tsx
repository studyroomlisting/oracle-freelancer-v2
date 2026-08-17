"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Milestone = { id: string; title: string; amountGbp: number; status: string; revisionNote?: string | null };

export default function MilestoneActions({
  orderId,
  milestone,
  viewerRole,
  orderStatus,
}: {
  orderId: string;
  milestone: Milestone;
  viewerRole: "client" | "provider" | null;
  orderStatus?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/milestones/${milestone.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit this milestone");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/milestones/${milestone.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't approve this milestone");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // FIXED (Milestone 8 gap): approve was previously the only option once
  // work was submitted — no way to send it back with feedback.
  async function requestRevision() {
    if (!revisionNote.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/milestones/${milestone.id}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: revisionNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send this request");
        return;
      }
      setRequestingRevision(false);
      setRevisionNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // FIXED (real bug found during review, UI side): matched to the same
  // server-side guard added in the submit route — canSubmit only checked
  // milestone.status, so "Mark delivered" showed and was clickable even
  // while the order itself was still PENDING_ACCEPTANCE. orderStatus is
  // optional (older callers not updated stay exactly as before, no
  // regression) — when provided, it's now part of the gate.
  const canSubmit =
    viewerRole === "provider" &&
    (milestone.status === "PENDING" || milestone.status === "IN_PROGRESS") &&
    (orderStatus === undefined || orderStatus === "IN_PROGRESS" || orderStatus === "IN_REVISION");
  const canApprove = viewerRole === "client" && milestone.status === "SUBMITTED";

  return (
    <div className="flex flex-col items-end gap-1 max-w-xs">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-neutral-900">£{milestone.amountGbp.toFixed(2)}</span>
        <span className="badge">{milestone.status.replace("_", " ")}</span>
      </div>
      {milestone.revisionNote && viewerRole === "provider" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-left">
          Changes requested: {milestone.revisionNote}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {canSubmit && (
        <button onClick={submit} disabled={loading} className="btn-primary py-1.5 px-3 text-xs">
          {loading ? "Submitting..." : "Mark delivered"}
        </button>
      )}
      {viewerRole === "provider" &&
        (milestone.status === "PENDING" || milestone.status === "IN_PROGRESS") &&
        orderStatus === "PENDING_ACCEPTANCE" && (
          <p className="text-[11px] text-neutral-400">Accept the order above before delivering</p>
        )}
      {canApprove && !requestingRevision && (
        <div className="flex gap-2">
          <button onClick={approve} disabled={loading} className="btn-primary py-1.5 px-3 text-xs">
            {loading ? "Approving..." : "Approve"}
          </button>
          <button onClick={() => setRequestingRevision(true)} disabled={loading} className="btn-secondary py-1.5 px-3 text-xs">
            Request changes
          </button>
        </div>
      )}
      {canApprove && requestingRevision && (
        <div className="flex flex-col gap-2 items-end w-full">
          <textarea
            className="input text-xs w-full"
            placeholder="What needs to change?"
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={requestRevision} disabled={loading || !revisionNote.trim()} className="btn-secondary py-1.5 px-3 text-xs">
              {loading ? "Sending..." : "Send request"}
            </button>
            <button onClick={() => setRequestingRevision(false)} className="text-xs text-neutral-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
