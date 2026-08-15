import Pagination from "@/components/Pagination";
import { searchGigs, getCategories } from "@/lib/queries";
import Link from "next/link";

function formatSession(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function WorkshopsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [{ gigs, totalCount, totalPages }, categories] = await Promise.all([
    searchGigs(searchParams.q, searchParams.category, "WORKSHOP", page),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Oracle workshops</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Scheduled, seat-limited cohort sessions — {totalCount} upcoming workshop{totalCount !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/workshops" className={`badge ${!searchParams.category ? "bg-brand-50 text-brand-700" : ""}`}>
          All modules
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/workshops?category=${c.slug}`} className="badge hover:bg-neutral-200">
            {c.name}
          </Link>
        ))}
      </div>

      {gigs.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">
          No workshops scheduled for this module right now — check back soon.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {gigs.map((g) => {
              const seatsLeft = g.maxSeats != null ? Math.max(g.maxSeats - (g.seatsBooked ?? 0), 0) : null;
              return (
                <Link
                  key={g.slug}
                  href={`/gigs/${g.slug}`}
                  className="card flex flex-col sm:flex-row gap-4 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="w-full sm:w-40 aspect-video sm:aspect-square bg-neutral-100 rounded flex items-center justify-center text-neutral-400 text-xs shrink-0 overflow-hidden">
                    {g.coverImageUrl ? (
                      <img src={g.coverImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      g.categoryName
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-brand-700 mb-1">{formatSession(g.sessionStartAt)}</p>
                    <p className="text-sm font-semibold text-neutral-900 mb-1">{g.title}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                      <span>{g.freelancerName}</span>
                      {g.isCertified && <span className="badge-certified">✓ Oracle Certified</span>}
                    </div>
                    <p className="text-xs text-neutral-500">
                      <span className="stars">★★★★★</span> {g.ratingAvg.toFixed(1)} ({g.ratingCount})
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span className="text-lg font-bold text-neutral-900">£{g.fromPriceGbp}/seat</span>
                    <span className={`text-xs font-semibold ${seatsLeft !== null && seatsLeft <= 5 ? "text-red-600" : "text-neutral-500"}`}>
                      {seatsLeft !== null ? `${seatsLeft} seats left` : "Seats limited"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/workshops" searchParams={{ q: searchParams.q, category: searchParams.category }} />
        </>
      )}
    </div>
  );
}
