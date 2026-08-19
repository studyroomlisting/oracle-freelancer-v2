"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // FIXED (real bug found during review): this always showed
      // data.message regardless of whether the request actually
      // succeeded — for the privacy-preserving "email may or may not be
      // registered" case that's correct (Supabase's own 200 response
      // deliberately doesn't reveal that either way), but a 429 from
      // OUR OWN in-app rate limiter (see the route — 5 requests per 15
      // minutes per IP) never even reaches Supabase, and data.message is
      // undefined for that response, so it silently fell back to the
      // same reassuring default text. The person had no way to tell
      // "no email is coming because you're rate-limited" apart from
      // "no email is coming because that address isn't registered."
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-sm text-neutral-700 block mb-1">Email</label>
            <input type="email" required maxLength={254} className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
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
