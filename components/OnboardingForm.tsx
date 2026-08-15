"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import ResumeUpload from "@/components/ResumeUpload";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";

type Category = { slug: string; name: string };

type FreelancerInitial = {
  headline: string;
  bio: string;
  oracleModules: string;
  yearsExperience: string;
  hourlyRateGbp: string;
  avatarUrl: string | null;
  resumeUrl: string | null;
};

type ClientInitial = {
  companyName: string;
  companyIndustry: string;
  companySize: string;
  avatarUrl: string | null;
};

export default function OnboardingForm({
  role,
  categories,
  initialFreelancer,
  initialClient,
}: {
  role: "FREELANCER" | "CLIENT";
  categories: Category[];
  initialFreelancer?: FreelancerInitial;
  initialClient?: ClientInitial;
}) {
  const router = useRouter();

  // Freelancer fields
  const [headline, setHeadline] = useState(initialFreelancer?.headline ?? "");
  const [bio, setBio] = useState(initialFreelancer?.bio ?? "");
  const [oracleModules, setOracleModules] = useState(initialFreelancer?.oracleModules ?? "");
  const [yearsExperience, setYearsExperience] = useState(initialFreelancer?.yearsExperience ?? "");
  const [hourlyRateGbp, setHourlyRateGbp] = useState(initialFreelancer?.hourlyRateGbp ?? "");
  const [resumeUrl, setResumeUrl] = useState(initialFreelancer?.resumeUrl ?? null);

  // Client fields
  const [companyName, setCompanyName] = useState(initialClient?.companyName ?? "");
  const [companyIndustry, setCompanyIndustry] = useState(initialClient?.companyIndustry ?? "");
  const [companySize, setCompanySize] = useState(initialClient?.companySize ?? "");

  const [avatarUrl, setAvatarUrl] = useState((role === "FREELANCER" ? initialFreelancer?.avatarUrl : initialClient?.avatarUrl) ?? null);
  const [submitting, setSubmitting] = useState<"save" | "finish" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(finish: boolean) {
    setError(null);
    const label = finish ? "finish" : "save";
    setSubmitting(label);
    try {
      const payload: any = { finish };
      if (role === "FREELANCER") {
        Object.assign(payload, { headline, bio, oracleModules, yearsExperience, hourlyRateGbp });
      } else {
        Object.assign(payload, { companyName, companyIndustry, companySize });
      }
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save — please try again.");
        return;
      }
      if (finish) {
        router.push(role === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard/client");
        router.refresh();
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function skip() {
    setSubmitting("skip");
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finish: true }),
      });
      if (res.ok) {
        router.push(role === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard/client");
        router.refresh();
      }
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-1">
        {role === "FREELANCER" ? "Set up your freelancer profile" : "Tell us about your company"}
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        {role === "FREELANCER"
          ? "A few details help clients find and trust you. Everything here can be edited later."
          : "Optional, but helps freelancers understand who they're working with. Everything here can be edited later."}
      </p>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">{error}</div>}

      <div className="flex flex-col gap-5">
        <ImageUpload endpoint="/api/uploads/avatar" currentUrl={avatarUrl} onUploaded={setAvatarUrl} label="Profile photo" />

        {role === "FREELANCER" ? (
          <>
            <div>
              <label className="text-sm font-semibold text-neutral-800 block mb-1">Headline</label>
              <input className="input" placeholder="e.g. Oracle Fusion SCM Consultant" maxLength={200} value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-800 block mb-1">Bio</label>
              <textarea className="input min-h-[100px]" maxLength={2000} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <CategoryMultiSelect categories={categories} value={oracleModules} onChange={setOracleModules} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-800 block mb-1">Years of experience</label>
                <input type="number" min={0} max={60} className="input" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 block mb-1">Hourly rate (GBP)</label>
                <input type="number" min={1} className="input" value={hourlyRateGbp} onChange={(e) => setHourlyRateGbp(e.target.value)} />
              </div>
            </div>
            <ResumeUpload currentUrl={resumeUrl} onUploaded={setResumeUrl} />
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-semibold text-neutral-800 block mb-1">Company name</label>
              <input className="input" maxLength={200} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-800 block mb-1">Industry</label>
                <input className="input" placeholder="e.g. Manufacturing" maxLength={100} value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 block mb-1">Company size</label>
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
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <button onClick={() => save(true)} disabled={submitting !== null} className="btn-primary">
          {submitting === "finish" ? "Finishing..." : "Finish setup"}
        </button>
        <button onClick={() => save(false)} disabled={submitting !== null} className="btn-secondary">
          {submitting === "save" ? "Saving..." : "Save & continue later"}
        </button>
        <button onClick={skip} disabled={submitting !== null} className="text-sm text-neutral-500 hover:underline sm:ml-auto">
          {submitting === "skip" ? "Skipping..." : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
