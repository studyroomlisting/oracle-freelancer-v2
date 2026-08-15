import Link from "next/link";
import TeamRecommenderForm from "@/components/TeamRecommenderForm";

export default function RecommendPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/teams" className="text-xs text-neutral-500 hover:underline">← Back to Oracle Project Teams</Link>
      <h1 className="text-2xl font-bold text-neutral-900 mt-2 mb-1">AI Team Recommender</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Answer a few questions and we'll recommend a team composition, then show you three options to compare.
      </p>
      <TeamRecommenderForm />
    </div>
  );
}
