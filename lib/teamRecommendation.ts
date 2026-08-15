import { calculateTeamEngagementTotal } from "@/lib/pricing";

export type RecommenderAnswers = {
  primaryModule: "FINANCE" | "HCM" | "SCM" | "EPM";
  procurement: boolean;
  inventory: boolean;
  manufacturing: boolean;
  integrations: boolean;
  dataMigration: boolean;
};

const leadRoleByModule: Record<RecommenderAnswers["primaryModule"], string> = {
  FINANCE: "Finance Functional Consultant",
  HCM: "HCM Functional Consultant",
  SCM: "SCM Functional Consultant",
  EPM: "EPM Functional Consultant",
};

// Turns questionnaire answers into an ordered list of required roles, matching
// the role names in lib/sampleData.ts::roleCatalogue.
export function recommendRoles(answers: RecommenderAnswers): { roles: string[]; estimatedWeeks: number } {
  const roles = new Set<string>();
  roles.add(leadRoleByModule[answers.primaryModule]);

  const needsScm = answers.procurement || answers.inventory || answers.manufacturing;
  if (needsScm && answers.primaryModule !== "SCM") {
    roles.add("SCM Functional Consultant");
  }
  if (answers.integrations) roles.add("Integration Specialist");
  if (answers.dataMigration) roles.add("Data Migration Consultant");
  roles.add("Technical Consultant");
  roles.add("Project Manager");

  // Base duration scales gently with scope — more sub-needs, more weeks.
  const subNeedCount = [answers.procurement, answers.inventory, answers.manufacturing, answers.integrations, answers.dataMigration].filter(
    Boolean
  ).length;
  const estimatedWeeks = 8 + subNeedCount * 1.5;

  return { roles: Array.from(roles), estimatedWeeks: Math.round(estimatedWeeks) };
}

export type ComparisonOption = {
  label: string;
  tagline: string;
  dailyRateGbp: number;
  estimatedWeeks: number;
  totalCostGbp: number;
  rating: number;
  composition: { role: string; consultantName: string; consultantSlug: string; dayRateGbp: number }[];
};

// Builds three illustrative comparison options (Budget / Balanced / Premium)
// from a base composition. With a small seeded consultant bench there's often
// only one real person per role today — the price/timeline/rating spread
// below is a transparent multiplier on that base so the comparison UX is
// testable now; real variation will come naturally as more freelancers join
// each role.
export function buildComparisonOptions(
  requiredRoles: string[],
  baseWeeks: number,
  roleCatalogue: { role: string; consultants: { name: string; slug: string; dayRateGbp: number; isCertified: boolean; ratingAvg: number }[] }[]
): ComparisonOption[] {
  const baseComposition = requiredRoles
    .map((role) => {
      const group = roleCatalogue.find((g) => g.role === role);
      const consultant = group?.consultants[0];
      if (!consultant) return null;
      return { role, consultantName: consultant.name, consultantSlug: consultant.slug, dayRateGbp: consultant.dayRateGbp, ratingAvg: consultant.ratingAvg };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const baseDailyRate = baseComposition.reduce((sum, c) => sum + c.dayRateGbp, 0);
  const avgRating = baseComposition.length
    ? baseComposition.reduce((sum, c) => sum + c.ratingAvg, 0) / baseComposition.length
    : 4.5;

  function buildOption(label: string, tagline: string, rateMultiplier: number, weeksDelta: number, ratingDelta: number): ComparisonOption {
    const dailyRateGbp = Math.round(baseDailyRate * rateMultiplier);
    const estimatedWeeks = Math.max(4, baseWeeks + weeksDelta);
    const totalCostGbp = calculateTeamEngagementTotal(dailyRateGbp, estimatedWeeks);
    const rating = Math.min(10, Math.max(1, Number((avgRating * 2 + ratingDelta).toFixed(1)))); // scale 5->10 then adjust
    return {
      label,
      tagline,
      dailyRateGbp,
      estimatedWeeks,
      totalCostGbp,
      rating,
      composition: baseComposition.map(({ role, consultantName, consultantSlug, dayRateGbp }) => ({
        role,
        consultantName,
        consultantSlug,
        dayRateGbp: Math.round(dayRateGbp * rateMultiplier),
      })),
    };
  }

  return [
    buildOption("Team A — Budget", "Lower cost, longer runway", 0.85, 2, -0.4),
    buildOption("Team B — Balanced", "Our standard recommendation", 1.0, 0, 0),
    buildOption("Team C — Premium", "Certified specialists, faster delivery", 1.25, -2, 0.3),
  ];
}
