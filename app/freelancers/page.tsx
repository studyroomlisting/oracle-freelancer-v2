import Link from "next/link";
import TopFreelancerCard from "@/components/TopFreelancerCard";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";
import { searchFreelancers, getCategories } from "@/lib/queries";

const sortOptions = [
  { value: "relevance", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
];

export default async function FreelancersDirectoryPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string; sort?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [{ freelancers, totalCount, totalPages }, categories] = await Promise.all([
    searchFreelancers(searchParams.q, searchParams.category, page, searchParams.sort),
    getCategories(),
  ]);
  const activeSort = searchParams.sort ?? "relevance";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">
        {searchParams.q ? `Freelancers matching "${searchParams.q}"` : "Browse Oracle freelancers"}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">{totalCount} freelancer{totalCount !== 1 ? "s" : ""}</p>

      <div className="flex flex-col sm:flex-row gap-8">
        <aside className="w-full sm:w-56 shrink-0">
          <form action="/freelancers" className="flex mb-8 border border-neutral-900 rounded overflow-hidden">
            <input
              name="q"
              defaultValue={searchParams.q}
              className="flex-1 border-none px-3 py-2 text-sm outline-none"
              placeholder="Search by name or skill"
              aria-label="Search freelancers"
            />
            <button type="submit" className="bg-neutral-900 text-white px-3.5" aria-label="Search">
              🔍
            </button>
          </form>

          <h2 className="text-sm font-bold text-neutral-900 mb-3">Module</h2>
          <ul className="flex flex-col">
            <li>
              <Link
                href={searchParams.q ? `/freelancers?q=${searchParams.q}` : "/freelancers"}
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
                  href={`/freelancers?category=${c.slug}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
                  className={`block py-2 border-b border-neutral-200 text-sm ${
                    searchParams.category === c.slug ? "font-bold text-brand-700" : "text-neutral-700"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          {freelancers.length === 0 ? (
            <div className="card p-10 text-center text-neutral-500">
              No freelancers match this search yet — try a broader term or a different module.
            </div>
          ) : (
            <>
              <form action="/freelancers" className="flex items-center justify-end mb-5 gap-2">
                <input type="hidden" name="q" value={searchParams.q ?? ""} />
                <input type="hidden" name="category" value={searchParams.category ?? ""} />
                <label className="text-sm text-neutral-600">Sort by:</label>
                <SortSelect options={sortOptions} defaultValue={activeSort} />
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {freelancers.map((f) => (
                  <TopFreelancerCard key={f.slug} freelancer={f} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/freelancers"
                searchParams={{ q: searchParams.q, category: searchParams.category, sort: searchParams.sort }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
