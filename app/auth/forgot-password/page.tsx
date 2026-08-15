"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? "If that email is registered, a reset link has been sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">Reset your password</h1>
      <p className="text-sm text-neutral-500 mb-6">Enter your email and we'll send you a reset link.</p>

      {message ? (
        <div className="card p-4 text-sm text-brand-700 bg-brand-50">{message}</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-neutral-700 block mb-1">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-sm text-neutral-500 mt-4">
        <a href="/auth/login" className="text-brand-600 hover:underline">
          ← Back to login
        </a>
      </p>
    </div>
  );
}
