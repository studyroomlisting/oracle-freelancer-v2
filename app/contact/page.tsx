"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send your message");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Contact us</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Questions about a booking, your account, or the platform in general — we're happy to help.
      </p>

      {submitted ? (
        <div className="card p-5 text-sm text-brand-700 bg-brand-50">Thanks — we'll get back to you soon.</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-sm text-neutral-700 block mb-1">Name</label>
            <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-700 block mb-1">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-700 block mb-1">Message</label>
            <textarea required className="input min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary self-start">
            {submitting ? "Sending..." : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
