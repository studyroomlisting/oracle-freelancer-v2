"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// FIXED (real bug found during review): this page used to require a
// `?token=` query param and post it to a bespoke /api/auth/reset-password
// route. Supabase's actual link for this project never sends a `token`
// param at all — see app/api/auth/forgot-password/route.ts for the full
// reason. The link now routes through /auth/callback first, which
// exchanges Supabase's `code` for a real (recovery) session — by the time
// someone lands here, they're genuinely signed in with that session, no
// token needed. This reuses the already-working, session-based
// /api/auth/change-password endpoint instead of a second, separate
// mechanism.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setInvalidLink(true);
        } else {
          setError(data.error ?? "Couldn't reset your password");
        }
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Link expired</h1>
        <p className="text-sm text-neutral-500 mb-4">
          This reset link is invalid or has expired. Request a new one below.
        </p>
        <a href="/auth/forgot-password" className="btn-secondary">
          Request a new link
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Password reset</h1>
        <p className="text-sm text-neutral-500">Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="text-sm text-neutral-700 block mb-1">New password</label>
          <input type="password" required minLength={8} maxLength={72} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Confirm password</label>
          <input type="password" required minLength={8} maxLength={72} className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
