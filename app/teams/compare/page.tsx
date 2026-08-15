import Link from "next/link";
import { roleCatalogue } from "@/lib/sampleData";
import { recommendRoles, buildComparisonOptions, type RecommenderAnswers } from "@/lib/teamRecommendation";
import TeamComparisonCards from "@/components/TeamComparisonCards";

function parseBool(v: string | undefined) {
  return v === "true";
}

export default function ComparePage({
  searchParams,
}: {
  searchParams: { primaryModule?: string; procurement?: string; inventory?: string; manufacturing?: string; integrations?: string; dataMigration?: string };
}) {
  const answers: RecommenderAnswers = {
    primaryModule: (searchParams.primaryModule as RecommenderAnswers["primaryModule"]) ?? "FINANCE",
    procurement: parseBool(searchParams.procurement),
    inventory: parseBool(searchParams.inventory),
    manufacturing: parseBool(searchParams.manufacturing),
    integrations: parseBool(searchParams.integrations),
    dataMigration: parseBool(searchParams.dataMigration),
  };

  const { roles, estimatedWeeks } = recommendRoles(answers);
  const options = buildComparisonOptions(roles, estimatedWeeks, roleCatalogue);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/teams/recommend" className="text-xs text-neutral-500 hover:underline">← Redo questionnaire</Link>
      <h1 className="text-2xl font-bold text-neutral-900 mt-2 mb-1">Recommended teams</h1>
      <p className="text-sm text-neutral-500 mb-2">
        Based on your answers, we recommend: {roles.join(", ")}.
      </p>
      <p className="text-xs text-neutral-500 mb-8">
        Pricing and ratings below are illustrative multipliers on today's seeded consultant bench — as more
        freelancers per role join, these three options will reflect real distinct people rather than rate variants.
      </p>

      <TeamComparisonCards options={options} />
    </div>
  );
}
