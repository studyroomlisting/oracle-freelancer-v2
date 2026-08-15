"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WorkExperienceEntry = { id: string; companyName: string; role: string; startYear: number; endYear: number | null; description: string | null };

// FIXED (real gap found during review): a freelancer profile had no way
// to show prior work history at all — only formal Education existed.
export default function WorkExperienceManager({ entries }: { entries: WorkExperienceEntry[] }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (endYear && Number(endYear) < Number(startYear)) {
      setError("End year can't be before the start year");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/freelancer/work-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, role, startYear, endYear: endYear || undefined, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this entry");
        return;
      }
      setCompanyName("");
      setRole("");
      setStartYear("");
      setEndYear("");
      setDescription("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/freelancer/work-experience/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-800 mb-2">Work experience</h2>
      {entries.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {entries.map((w) => (
            <div key={w.id} className="card p-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{w.role} · {w.companyName}</p>
                <p className="text-xs text-neutral-500">{w.startYear} – {w.endYear ?? "Present"}</p>
                {w.description && <p className="text-xs text-neutral-600 mt-1">{w.description}</p>}
              </div>
              <button onClick={() => deleteEntry(w.id)} disabled={deletingId === w.id} className="text-xs font-semibold text-red-600 hover:underline shrink-0">
                {deletingId === w.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addEntry} className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-700">Add work experience</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Company" minLength={2} maxLength={200} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <input className="input" placeholder="Role / title" minLength={2} maxLength={200} value={role} onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min={1950} max={2100} step={1} inputMode="numeric" className="input" placeholder="Start year" value={startYear} onChange={(e) => setStartYear(e.target.value)} required />
          <input type="number" min={1950} max={2100} step={1} inputMode="numeric" className="input" placeholder="End year (blank = present)" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
        </div>
        <textarea className="input min-h-[60px]" placeholder="What did you work on? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        <button type="submit" disabled={submitting} className="btn-secondary self-start">
          {submitting ? "Adding..." : "Add work experience"}
        </button>
      </form>
    </div>
  );
}
