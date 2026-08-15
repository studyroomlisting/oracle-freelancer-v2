"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: searchParams.token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't reset your password");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!searchParams.token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Invalid link</h1>
        <p className="text-sm text-neutral-500">This reset link is missing its token.</p>
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
          <input type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Confirm password</label>
          <input type="password" required minLength={8} className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
