"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import ResumeUpload from "@/components/ResumeUpload";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import PortfolioManager from "@/components/PortfolioManager";
import EducationManager from "@/components/EducationManager";
import WorkExperienceManager from "@/components/WorkExperienceManager";

type Category = { slug: string; name: string };

export default function EditProfileForm({
  initial,
  categories,
  portfolioItems,
  educationEntries,
  workExperienceEntries,
}: {
  initial: {
    headline: string;
    bio: string;
    oracleModules: string;
    hourlyRateGbp: string;
    yearsExperience: string;
    avatarUrl: string | null;
    resumeUrl: string | null;
    isProfilePublic: boolean;
  };
  categories: Category[];
  portfolioItems: { id: string; title: string; description: string; imageUrl: string | null; videoUrl: string | null; projectUrl: string | null }[];
  educationEntries: { id: string; institution: string; degree: string; fieldOfStudy: string | null; graduationYear: number | null }[];
  workExperienceEntries: { id: string; companyName: string; role: string; startYear: number; endYear: number | null; description: string | null }[];
}) {
  const router = useRouter();
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [oracleModules, setOracleModules] = useState(initial.oracleModules);
  const [hourlyRateGbp, setHourlyRateGbp] = useState(initial.hourlyRateGbp);
  const [yearsExperience, setYearsExperience] = useState(initial.yearsExperience);
  const [isProfilePublic, setIsProfilePublic] = useState(initial.isProfilePublic);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/freelancer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, bio, oracleModules, hourlyRateGbp, yearsExperience, isProfilePublic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your profile");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <ImageUpload endpoint="/api/uploads/avatar" currentUrl={initial.avatarUrl} onUploaded={() => router.refresh()} label="Profile photo" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        {saved && <div className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded p-3">Saved.</div>}

        <div>
          <label className="text-sm font-semibold text-neutral-800 block mb-1">Headline</label>
          <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-semibold text-neutral-800 block mb-1">Bio</label>
          <textarea className="input min-h-[120px]" value={bio} onChange={(e) => setBio(e.target.value)} required />
        </div>
        <CategoryMultiSelect categories={categories} value={oracleModules} onChange={setOracleModules} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-600 block mb-1">Hourly rate (£)</label>
            <input type="number" min={1} className="input" value={hourlyRateGbp} onChange={(e) => setHourlyRateGbp(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-neutral-600 block mb-1">Years of experience</label>
            <input type="number" min={0} className="input" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={isProfilePublic} onChange={(e) => setIsProfilePublic(e.target.checked)} className="rounded border-neutral-300" />
          Make my profile visible to clients
        </label>

        <button type="submit" disabled={saving} className="btn-primary self-start">
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <ResumeUpload currentUrl={initial.resumeUrl} onUploaded={() => router.refresh()} />
      <PortfolioManager items={portfolioItems} />
      <EducationManager entries={educationEntries} />
      <WorkExperienceManager entries={workExperienceEntries} />
    </div>
  );
}
