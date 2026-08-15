import { describe, it, expect } from "vitest";
import { calculateFreelancerCompletion, calculateClientCompletion, categoryNameToModuleCode, parseOracleModules } from "@/lib/onboarding";

describe("categoryNameToModuleCode", () => {
  it("strips Oracle and Fusion prefixes", () => {
    expect(categoryNameToModuleCode("Oracle Fusion SCM")).toBe("SCM");
    expect(categoryNameToModuleCode("Oracle Fusion Financials")).toBe("Financials");
  });

  it("strips only Oracle when there's no Fusion", () => {
    expect(categoryNameToModuleCode("Oracle EBS")).toBe("EBS");
    expect(categoryNameToModuleCode("Oracle OIC")).toBe("OIC");
    expect(categoryNameToModuleCode("Oracle APEX")).toBe("APEX");
    expect(categoryNameToModuleCode("Oracle EPM")).toBe("EPM");
  });
});

describe("parseOracleModules", () => {
  it("splits, trims, and drops empty entries", () => {
    expect(parseOracleModules("SCM, HCM ,  ,OIC")).toEqual(["SCM", "HCM", "OIC"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseOracleModules("")).toEqual([]);
  });
});

describe("calculateFreelancerCompletion", () => {
  const empty = { headline: "", bio: "", oracleModules: "", yearsExperience: 0, hourlyRateGbp: null, avatarUrl: null, resumeUrl: null };

  it("is 0% for a completely empty profile", () => {
    const result = calculateFreelancerCompletion(empty);
    expect(result.percent).toBe(0);
    expect(result.missing).toContain("Headline");
    expect(result.missing).toContain("Resume");
  });

  it("is 100% when every field is filled", () => {
    const result = calculateFreelancerCompletion({
      headline: "Oracle SCM specialist",
      bio: "I have ten years of experience in Oracle Fusion SCM implementations.",
      oracleModules: "SCM,Inventory",
      yearsExperience: 10,
      hourlyRateGbp: 75,
      avatarUrl: "/uploads/avatars/a.jpg",
      resumeUrl: "/uploads/resumes/a.pdf",
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("does not count a short, low-effort bio as filled", () => {
    const result = calculateFreelancerCompletion({ ...empty, bio: "hi" });
    expect(result.missing).toContain("Bio");
  });

  it("is a partial percentage when some fields are filled", () => {
    const result = calculateFreelancerCompletion({ ...empty, headline: "Consultant", yearsExperience: 5 });
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
  });
});

describe("calculateClientCompletion", () => {
  const empty = { fullName: "", companyName: null, companyIndustry: null, companySize: null, avatarUrl: null };

  it("is 0% for a completely empty client profile", () => {
    expect(calculateClientCompletion(empty).percent).toBe(0);
  });

  it("is 100% when every field is filled", () => {
    const result = calculateClientCompletion({
      fullName: "Jane Smith",
      companyName: "Acme Ltd",
      companyIndustry: "Manufacturing",
      companySize: "51-200",
      avatarUrl: "/uploads/avatars/a.jpg",
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("lists exactly which fields are missing", () => {
    const result = calculateClientCompletion({ ...empty, fullName: "Jane Smith", companyName: "Acme Ltd" });
    expect(result.missing).toEqual(["Industry", "Company size", "Profile photo"]);
  });
});
