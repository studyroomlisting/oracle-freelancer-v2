"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"CLIENT" | "FREELANCER">("CLIENT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't create this user");
        return;
      }
      setFullName("");
      setEmail("");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary mb-6">
        Create user
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-6 flex flex-col gap-3 max-w-md">
      <p className="text-sm font-semibold text-neutral-900">Create a new user</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input className="input" placeholder="Full name" minLength={2} maxLength={200} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <input type="email" className="input" placeholder="Email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} required />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as "CLIENT" | "FREELANCER")}>
        <option value="CLIENT">Client</option>
        <option value="FREELANCER">Freelancer</option>
      </select>
      <p className="text-xs text-neutral-500">They'll need to use "Forgot password" to sign in — there's no real email delivery to hand them a temporary one directly.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary py-2 px-4 text-sm">
          {submitting ? "Creating..." : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
