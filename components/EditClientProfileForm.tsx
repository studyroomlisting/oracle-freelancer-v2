"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";

export default function EditClientProfileForm({
  initial,
}: {
  initial: { companyName: string; companyIndustry: string; companySize: string; avatarUrl: string | null };
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyIndustry, setCompanyIndustry] = useState(initial.companyIndustry);
  const [companySize, setCompanySize] = useState(initial.companySize);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyIndustry, companySize }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <ImageUpload endpoint="/api/uploads/avatar" currentUrl={initial.avatarUrl} onUploaded={() => router.refresh()} label="Profile photo" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        {saved && <div className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded p-3">Saved.</div>}

        <div>
          <label className="text-sm font-semibold text-neutral-800 block mb-1">Company name</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-600 block mb-1">Industry</label>
            <input className="input" value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-neutral-600 block mb-1">Company size</label>
            <select className="input" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
              <option value="">Select...</option>
              <option value="1-10">1–10</option>
              <option value="11-50">11–50</option>
              <option value="51-200">51–200</option>
              <option value="201-1000">201–1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary self-start">
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
