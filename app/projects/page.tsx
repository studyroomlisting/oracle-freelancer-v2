import Link from "next/link";
import { getOpenProjects } from "@/lib/queries";
import Pagination from "@/components/Pagination";

export default async function ProjectsPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const { postings: projects, totalCount, totalPages } = await getOpenProjects(page, searchParams.q);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Open Oracle projects</h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-xl">
            Companies post a brief, freelancers apply with a proposal, the client picks one — like comparing
            consultancy proposals, but from independent Oracle specialists.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary shrink-0">
          Post Requirement
        </Link>
      </div>

      <form action="/projects" className="flex mb-6 border border-neutral-900 rounded overflow-hidden max-w-md">
        <input
          name="q"
          defaultValue={searchParams.q}
          maxLength={200}
          className="flex-1 border-none px-3 py-2 text-sm outline-none"
          placeholder="Search project titles and briefs"
          aria-label="Search projects"
        />
        <button type="submit" className="bg-neutral-900 text-white px-3.5" aria-label="Search">
          🔍
        </button>
      </form>
      <p className="text-sm text-neutral-500 mb-4">{totalCount} project{totalCount !== 1 ? "s" : ""}</p>

      {projects.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">
          {searchParams.q
            ? "No open projects match that search — try a broader term."
            : process.env.DATABASE_URL
              ? "No open projects right now. Check back soon."
              : "Connect a database to see live postings."}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {projects.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="card p-5 hover:shadow-md transition-shadow flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs text-brand-700 font-semibold mb-1">{p.category.name}</p>
                  <p className="text-sm font-bold text-neutral-900 mb-1">{p.title}</p>
                  <p className="text-xs text-neutral-500 line-clamp-2 max-w-xl">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  {(p.budgetMinGbp || p.budgetMaxGbp) && (
                    <p className="text-sm font-bold text-neutral-900">
                      £{Number(p.budgetMinGbp ?? 0).toLocaleString()}
                      {p.budgetMaxGbp ? `–£${Number(p.budgetMaxGbp).toLocaleString()}` : "+"}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">{p._count.applications} application{p._count.applications !== 1 ? "s" : ""}</p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/projects" searchParams={{ q: searchParams.q }} />
        </>
      )}
    </div>
  );
}
