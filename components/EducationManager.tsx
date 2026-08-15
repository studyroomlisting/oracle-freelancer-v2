"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EducationEntry = { id: string; institution: string; degree: string; fieldOfStudy: string | null; graduationYear: number | null };

export default function EducationManager({ entries }: { entries: EducationEntry[] }) {
  const router = useRouter();
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/freelancer/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution, degree, fieldOfStudy: fieldOfStudy || undefined, graduationYear: graduationYear || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this entry");
        return;
      }
      setInstitution("");
      setDegree("");
      setFieldOfStudy("");
      setGraduationYear("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/freelancer/education/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-800 mb-2">Education</h2>
      {entries.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {entries.map((e) => (
            <div key={e.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""}</p>
                <p className="text-xs text-neutral-500">{e.institution}{e.graduationYear ? ` · ${e.graduationYear}` : ""}</p>
              </div>
              <button onClick={() => deleteEntry(e.id)} disabled={deletingId === e.id} className="text-xs font-semibold text-red-600 hover:underline">
                {deletingId === e.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addEntry} className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-700">Add education</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input className="input" placeholder="Institution" minLength={2} maxLength={200} value={institution} onChange={(e) => setInstitution(e.target.value)} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Degree" minLength={2} maxLength={200} value={degree} onChange={(e) => setDegree(e.target.value)} required />
          <input className="input" placeholder="Field of study (optional)" maxLength={200} value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} />
        </div>
        <input type="number" min={1950} max={2100} step={1} inputMode="numeric" className="input" placeholder="Graduation year (optional)" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} />
        <button type="submit" disabled={submitting} className="btn-secondary self-start">
          {submitting ? "Adding..." : "Add education"}
        </button>
      </form>
    </div>
  );
}
