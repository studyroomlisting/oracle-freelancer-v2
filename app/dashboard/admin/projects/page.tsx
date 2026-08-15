import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllProjectPostingsForAdmin } from "@/lib/queries";
import AdminProjectsList, { type AdminProject } from "@/components/AdminProjectsList";
import Pagination from "@/components/Pagination";

const statuses = ["DRAFT", "PENDING_REVIEW", "OPEN", "REJECTED", "AWARDED", "CLOSED"];

export default async function AdminManageProjectsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Project management requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const { postings, totalCount, totalPages } = await getAllProjectPostingsForAdmin(page, searchParams.q, searchParams.status);

  const projects: AdminProject[] = postings.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    categoryName: p.category.name,
    clientName: p.client.fullName,
    applicationCount: p._count.applications,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-1">Manage projects</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {totalCount} project{totalCount !== 1 ? "s" : ""} — every status, not just pending review.
      </p>

      <form action="/dashboard/admin/projects" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          className="input flex-1 min-w-[180px]"
          placeholder="Search by title"
        />
        <select name="status" defaultValue={searchParams.status ?? ""} className="input w-auto">
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">
          Filter
        </button>
      </form>

      <AdminProjectsList initialProjects={projects} />

      <div className="mt-6">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/dashboard/admin/projects"
          searchParams={{ q: searchParams.q, status: searchParams.status }}
        />
      </div>
    </div>
  );
}
