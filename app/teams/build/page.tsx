import { roleCatalogue } from "@/lib/sampleData";
import TeamBuilder from "@/components/TeamBuilder";
import Link from "next/link";

export default function BuildTeamPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/teams" className="text-xs text-neutral-500 hover:underline">← Back to Oracle Project Teams</Link>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2 mb-1">Build your own team</h1>
        <p className="text-sm text-neutral-500 max-w-2xl">
          Pick one consultant per role. We'll calculate a combined day rate and a rough project duration as you go.
        </p>
      </div>
      <TeamBuilder roleCatalogue={roleCatalogue} />
    </div>
  );
}
