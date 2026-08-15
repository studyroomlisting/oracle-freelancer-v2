import GigCard from "@/components/GigCard";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";
import { searchGigs, getCategories, type GigTypeFilter } from "@/lib/queries";
import Link from "next/link";

const sortOptions = [
  { value: "relevance", label: "Best selling" },
  { value: "newest", label: "Newest arrivals" },
  { value: "rating", label: "Highest rated" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string; type?: string; page?: string; budgetMin?: string; budgetMax?: string; certified?: string };
}) {
  const gigType = (searchParams.type as GigTypeFilter | undefined) ?? "CONSULTING";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const budgetMin = searchParams.budgetMin ? Number(searchParams.budgetMin) : undefined;
  const budgetMax = searchParams.budgetMax ? Number(searchParams.budgetMax) : undefined;
  const certifiedOnly = searchParams.certified === "1";

  const [{ gigs, totalCount, totalPages }, categories] = await Promise.all([
    searchGigs(searchParams.q, searchParams.category, gigType, page, {
      budgetMin,
      budgetMax,
      sort: searchParams.sort,
      certifiedOnly,
    }),
    getCategories(),
  ]);

  const activeSort = searchParams.sort ?? "relevance";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">
        {searchParams.q ? `Results for "${searchParams.q}"` : "Oracle freelance services"}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">{totalCount} result{totalCount !== 1 ? "s" : ""}</p>

      {/* FIXED (real gap found during review): the ONLY text search input
          anywhere in the app used to be the navbar's, which is hidden
          below the md: breakpoint with no fallback — meaning there was
          literally no way to search at all on mobile, and no way to
          refine a search from this page itself even on desktop. This is
          a real, visible, always-present search box, matching the
          pattern already correctly used on /freelancers and /projects. */}
      <form action="/browse" method="GET" className="flex mb-6 border border-neutral-900 rounded overflow-hidden max-w-md">
        <input type="hidden" name="type" value={searchParams.type ?? ""} />
        <input
          name="q"
          defaultValue={searchParams.q}
          className="flex-1 border-none px-3 py-2 text-sm outline-none"
          placeholder="What Oracle skill are you looking for?"
          aria-label="Search gigs"
        />
        <button type="submit" className="bg-neutral-900 text-white px-3.5" aria-label="Search">
          🔍
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-8">
        <aside className="w-full sm:w-56 shrink-0">
          <h2 className="text-sm font-bold text-neutral-900 mb-3">Module</h2>
          <ul className="flex flex-col mb-6">
            <li>
              <Link
                href="/browse"
                className={`block py-2 border-b border-neutral-200 text-sm ${
                  !searchParams.category ? "font-bold text-brand-700" : "text-neutral-700"
                }`}
              >
                All modules
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/browse?category=${c.slug}`}
                  className={`block py-2 border-b border-neutral-200 text-sm ${
                    searchParams.category === c.slug ? "font-bold text-brand-700" : "text-neutral-700"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* FIXED (feature request): budget/certified/sort were previously
              decorative inputs with no name attributes and no form —
              changing them did nothing. Now a single GET form that
              preserves the current search/category/type/page via hidden
              fields and actually filters. */}
          <form action="/browse" method="GET" className="flex flex-col gap-1">
            <input type="hidden" name="q" value={searchParams.q ?? ""} />
            <input type="hidden" name="category" value={searchParams.category ?? ""} />
            <input type="hidden" name="type" value={searchParams.type ?? ""} />
            <input type="hidden" name="sort" value={searchParams.sort ?? ""} />

            <h2 className="text-sm font-bold text-neutral-900 mb-3">Seller details</h2>
            <label className="flex items-center gap-2 text-sm text-neutral-700 py-1.5">
              <input type="checkbox" name="certified" value="1" defaultChecked={certifiedOnly} className="rounded border-neutral-300" />
              Oracle Certified only
            </label>

            <h2 className="text-sm font-bold text-neutral-900 mt-6 mb-3">Budget (GBP)</h2>
            <div className="flex items-center gap-2 mb-3">
              <input name="budgetMin" type="number" min={0} defaultValue={searchParams.budgetMin} className="input" placeholder="Min" />
              <span className="text-neutral-400">–</span>
              <input name="budgetMax" type="number" min={0} defaultValue={searchParams.budgetMax} className="input" placeholder="Max" />
            </div>
            <button type="submit" className="btn-secondary">
              Apply filters
            </button>
          </form>
        </aside>

        <div className="flex-1">
          <form action="/browse" method="GET" className="flex items-center justify-end mb-5 gap-2">
            <input type="hidden" name="q" value={searchParams.q ?? ""} />
            <input type="hidden" name="category" value={searchParams.category ?? ""} />
            <input type="hidden" name="type" value={searchParams.type ?? ""} />
            <input type="hidden" name="budgetMin" value={searchParams.budgetMin ?? ""} />
            <input type="hidden" name="budgetMax" value={searchParams.budgetMax ?? ""} />
            <input type="hidden" name="certified" value={searchParams.certified ?? ""} />
            <label className="text-sm text-neutral-600">Sort by:</label>
            <SortSelect options={sortOptions} defaultValue={activeSort} />
          </form>

          {gigs.length === 0 ? (
            <div className="card p-10 text-center text-neutral-500">
              No gigs match your search yet. Try a broader term, a wider budget, or browse all modules.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {gigs.map((g) => (
                  <GigCard key={g.slug} gig={g} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/browse"
                searchParams={{
                  q: searchParams.q,
                  category: searchParams.category,
                  sort: searchParams.sort,
                  type: searchParams.type,
                  budgetMin: searchParams.budgetMin,
                  budgetMax: searchParams.budgetMax,
                  certified: searchParams.certified,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
