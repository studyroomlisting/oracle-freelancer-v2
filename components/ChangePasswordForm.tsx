"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't change your password");
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirm("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-brand-700">Password updated successfully.</p>}
      <div>
        <label className="text-sm text-neutral-600 block mb-1">New password</label>
        <input type="password" className="input" minLength={8} maxLength={72} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-neutral-600 block mb-1">Confirm new password</label>
        <input type="password" className="input" minLength={8} maxLength={72} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-auto px-6">
        {submitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
