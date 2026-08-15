"use client";

import { useState } from "react";

export type PendingCertification = {
  id: string;
  name: string;
  issuer: string;
  freelancerName: string;
};

export default function PendingCertificationsList({ initialCertifications }: { initialCertifications: PendingCertification[] }) {
  const [certs, setCerts] = useState(initialCertifications);
  const [pending, setPending] = useState<string | null>(null);

  async function verify(id: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/certifications/${id}/verify`, { method: "POST" });
      if (res.ok) setCerts((c) => c.filter((x) => x.id !== id));
    } finally {
      setPending(null);
    }
  }

  if (certs.length === 0) {
    return <div className="card p-6 text-sm text-neutral-500 text-center">No certifications awaiting verification.</div>;
  }

  return (
    <div className="card divide-y divide-neutral-200">
      {certs.map((c) => (
        <div key={c.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
            <p className="text-xs text-neutral-500">
              {c.freelancerName} · Issued by {c.issuer}
            </p>
          </div>
          <button onClick={() => verify(c.id)} disabled={pending === c.id} className="btn-primary py-2 px-3 text-xs">
            {pending === c.id ? "Verifying..." : "Verify"}
          </button>
        </div>
      ))}
    </div>
  );
}
