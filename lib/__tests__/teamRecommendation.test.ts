import { describe, it, expect } from "vitest";
import { recommendRoles, buildComparisonOptions } from "@/lib/teamRecommendation";

describe("recommendRoles", () => {
  it("always includes the primary module lead and a PM", () => {
    const { roles } = recommendRoles({
      primaryModule: "FINANCE",
      procurement: false,
      inventory: false,
      manufacturing: false,
      integrations: false,
      dataMigration: false,
    });
    expect(roles).toContain("Finance Functional Consultant");
    expect(roles).toContain("Project Manager");
  });

  it("adds an SCM consultant when procurement/inventory/manufacturing is needed and primary isn't already SCM", () => {
    const { roles } = recommendRoles({
      primaryModule: "FINANCE",
      procurement: true,
      inventory: false,
      manufacturing: false,
      integrations: false,
      dataMigration: false,
    });
    expect(roles).toContain("SCM Functional Consultant");
  });

  it("does not duplicate the SCM role when primary module is already SCM", () => {
    const { roles } = recommendRoles({
      primaryModule: "SCM",
      procurement: true,
      inventory: true,
      manufacturing: false,
      integrations: false,
      dataMigration: false,
    });
    const scmCount = roles.filter((r) => r === "SCM Functional Consultant").length;
    // roles is built via a Set, so duplicates are structurally impossible —
    // this asserts the role appears exactly once (as the primary-module
    // lead), not zero times and not more than once.
    expect(scmCount).toBe(1);
  });

  it("adds Integration Specialist and Data Migration Consultant when requested", () => {
    const { roles } = recommendRoles({
      primaryModule: "HCM",
      procurement: false,
      inventory: false,
      manufacturing: false,
      integrations: true,
      dataMigration: true,
    });
    expect(roles).toContain("Integration Specialist");
    expect(roles).toContain("Data Migration Consultant");
  });

  it("scales estimated weeks with the number of sub-needs", () => {
    const minimal = recommendRoles({
      primaryModule: "FINANCE",
      procurement: false,
      inventory: false,
      manufacturing: false,
      integrations: false,
      dataMigration: false,
    });
    const maximal = recommendRoles({
      primaryModule: "FINANCE",
      procurement: true,
      inventory: true,
      manufacturing: true,
      integrations: true,
      dataMigration: true,
    });
    expect(maximal.estimatedWeeks).toBeGreaterThan(minimal.estimatedWeeks);
  });
});

describe("buildComparisonOptions", () => {
  const catalogue = [
    { role: "Finance Functional Consultant", consultants: [{ name: "Grace M.", slug: "grace-m", dayRateGbp: 650, isCertified: true, ratingAvg: 5.0 }] },
    { role: "Project Manager", consultants: [{ name: "Nadia S.", slug: "nadia-s", dayRateGbp: 600, isCertified: true, ratingAvg: 4.9 }] },
  ];

  it("produces exactly three options: Budget, Balanced, Premium", () => {
    const options = buildComparisonOptions(["Finance Functional Consultant", "Project Manager"], 8, catalogue);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.label)).toEqual(["Team A — Budget", "Team B — Balanced", "Team C — Premium"]);
  });

  it("prices Budget lower and Premium higher than Balanced", () => {
    const [budget, balanced, premium] = buildComparisonOptions(["Finance Functional Consultant", "Project Manager"], 8, catalogue);
    expect(budget.dailyRateGbp).toBeLessThan(balanced.dailyRateGbp);
    expect(premium.dailyRateGbp).toBeGreaterThan(balanced.dailyRateGbp);
  });

  it("skips roles that don't exist in the catalogue rather than crashing", () => {
    const options = buildComparisonOptions(["Nonexistent Role", "Project Manager"], 8, catalogue);
    expect(options[0].composition.some((c) => c.role === "Project Manager")).toBe(true);
    expect(options[0].composition.some((c) => c.role === "Nonexistent Role")).toBe(false);
  });
});
