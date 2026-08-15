"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitCertificationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("Oracle");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/freelancer/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, issuer, credentialUrl: credentialUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit that certification");
        return;
      }
      setName("");
      setCredentialUrl("");
      setSubmitted(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {submitted && <p className="text-sm text-brand-700">Submitted — an admin will review it shortly.</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          className="input"
          placeholder="Certification name, e.g. Oracle Cloud SCM 2024 Certified Implementation Specialist"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input className="input" placeholder="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} required />
      </div>
      <input
        className="input"
        placeholder="Credential URL (optional)"
        value={credentialUrl}
        onChange={(e) => setCredentialUrl(e.target.value)}
      />
      <button type="submit" disabled={submitting || !name} className="btn-secondary self-start">
        {submitting ? "Submitting..." : "Submit for verification"}
      </button>
    </form>
  );
}
