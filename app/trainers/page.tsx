import GigCard from "@/components/GigCard";
import Pagination from "@/components/Pagination";
import { searchGigs, getCategories } from "@/lib/queries";
import Link from "next/link";

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [{ gigs, totalCount, totalPages }, categories] = await Promise.all([
    searchGigs(searchParams.q, searchParams.category, "TRAINING", page),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Oracle trainers</h1>
      <p className="text-sm text-neutral-500 mb-6">
        1:1 and small-group coaching sessions — {totalCount} training gig{totalCount !== 1 ? "s" : ""} available
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/trainers" className={`badge ${!searchParams.category ? "bg-brand-50 text-brand-700" : ""}`}>
          All modules
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/trainers?category=${c.slug}`} className="badge hover:bg-neutral-200">
            {c.name}
          </Link>
        ))}
      </div>

      {gigs.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">
          No trainers match this filter yet — try a different module.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {gigs.map((g) => (
              <GigCard key={g.slug} gig={g} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/trainers" searchParams={{ q: searchParams.q, category: searchParams.category }} />
        </>
      )}
    </div>
  );
}
