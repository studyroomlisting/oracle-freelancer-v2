"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ManageableUser = { id: string; fullName: string; email: string; role: string; isSuspended: boolean };

export default function UserManagementActions({ user }: { user: ManageableUser }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleSuspend() {
    setLoading("suspend");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/${user.isSuspended ? "unsuspend" : "suspend"}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't update this account");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function saveEdit() {
    setLoading("edit");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save changes");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function changeRole() {
    const newRole = user.role === "CLIENT" ? "FREELANCER" : "CLIENT";
    setLoading("role");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't change this user's role");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function deleteUser() {
    setLoading("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete this user");
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (user.role === "ADMIN") return null;

  if (editing) {
    return (
      <div className="flex flex-col gap-2 items-end w-full max-w-xs">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input className="input text-xs" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
        <input className="input text-xs" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <div className="flex gap-2">
          <button onClick={saveEdit} disabled={loading !== null} className="text-xs font-semibold text-brand-700 hover:underline">
            {loading === "edit" ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <button onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-700 hover:underline">
          Edit
        </button>
        <button onClick={changeRole} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
          {loading === "role" ? "Saving..." : `Make ${user.role === "CLIENT" ? "freelancer" : "client"}`}
        </button>
        <button onClick={toggleSuspend} disabled={loading !== null} className="text-xs font-semibold text-neutral-600 hover:underline">
          {loading === "suspend" ? "Saving..." : user.isSuspended ? "Unsuspend" : "Suspend"}
        </button>
        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
            Delete
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Delete permanently?</span>
            <button onClick={deleteUser} disabled={loading !== null} className="text-xs font-semibold text-red-600 hover:underline">
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
