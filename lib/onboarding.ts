// Categories are stored/matched elsewhere (team role catalogue, search
// filtering) as short module codes ("SCM", "OIC"), not full category names
// ("Oracle Fusion SCM") — this derives the same short code from a category
// name so the new structured selection UI writes the same format the rest
// of the app already expects, rather than introducing a second format.
export function categoryNameToModuleCode(categoryName: string): string {
  return categoryName.replace(/^Oracle\s+/i, "").replace(/^Fusion\s+/i, "").trim();
}

export function parseOracleModules(oracleModules: string): string[] {
  return oracleModules
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

// Profile completion — a simple, transparent weighted checklist rather than
// a black-box score. Each field is worth an equal share; returns a whole
// percentage plus which fields are still missing, so the UI can show both
// "73% complete" and a concrete "what's left" list.

export type FreelancerCompletionInput = {
  headline: string;
  bio: string;
  oracleModules: string;
  yearsExperience: number;
  hourlyRateGbp: number | null;
  avatarUrl: string | null;
  resumeUrl: string | null;
};

const FREELANCER_FIELDS: { key: keyof FreelancerCompletionInput; label: string; filled: (v: FreelancerCompletionInput) => boolean }[] = [
  { key: "headline", label: "Headline", filled: (v) => v.headline.trim().length > 0 },
  { key: "bio", label: "Bio", filled: (v) => v.bio.trim().length >= 20 },
  { key: "oracleModules", label: "Skills/categories", filled: (v) => v.oracleModules.trim().length > 0 },
  { key: "yearsExperience", label: "Years of experience", filled: (v) => v.yearsExperience > 0 },
  { key: "hourlyRateGbp", label: "Hourly rate", filled: (v) => v.hourlyRateGbp != null && v.hourlyRateGbp > 0 },
  { key: "avatarUrl", label: "Profile photo", filled: (v) => !!v.avatarUrl },
  { key: "resumeUrl", label: "Resume", filled: (v) => !!v.resumeUrl },
];

export function calculateFreelancerCompletion(input: FreelancerCompletionInput): { percent: number; missing: string[] } {
  const missing = FREELANCER_FIELDS.filter((f) => !f.filled(input)).map((f) => f.label);
  const percent = Math.round(((FREELANCER_FIELDS.length - missing.length) / FREELANCER_FIELDS.length) * 100);
  return { percent, missing };
}

export type ClientCompletionInput = {
  fullName: string;
  companyName: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  avatarUrl: string | null;
};

const CLIENT_FIELDS: { key: keyof ClientCompletionInput; label: string; filled: (v: ClientCompletionInput) => boolean }[] = [
  { key: "fullName", label: "Full name", filled: (v) => v.fullName.trim().length > 0 },
  { key: "companyName", label: "Company name", filled: (v) => !!v.companyName },
  { key: "companyIndustry", label: "Industry", filled: (v) => !!v.companyIndustry },
  { key: "companySize", label: "Company size", filled: (v) => !!v.companySize },
  { key: "avatarUrl", label: "Profile photo", filled: (v) => !!v.avatarUrl },
];

export function calculateClientCompletion(input: ClientCompletionInput): { percent: number; missing: string[] } {
  const missing = CLIENT_FIELDS.filter((f) => !f.filled(input)).map((f) => f.label);
  const percent = Math.round(((CLIENT_FIELDS.length - missing.length) / CLIENT_FIELDS.length) * 100);
  return { percent, missing };
}
