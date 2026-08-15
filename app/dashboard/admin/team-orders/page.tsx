import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllTeamOrdersForAdmin } from "@/lib/queries";
import Pagination from "@/components/Pagination";

const statuses = ["REQUESTED", "DEPOSIT_PAID", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const statusLabels: Record<string, string> = {
  REQUESTED: "Awaiting deposit",
  DEPOSIT_PAID: "Deposit paid",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function AdminTeamOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Team order visibility requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const { teamOrders, totalCount, totalPages } = await getAllTeamOrdersForAdmin(page, searchParams.status);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-1">Team engagement requests</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {totalCount} request{totalCount !== 1 ? "s" : ""} — prebuilt and custom team engagements clients have requested.
      </p>

      <form action="/dashboard/admin/team-orders" className="flex flex-wrap gap-2 mb-6">
        <select name="status" defaultValue={searchParams.status ?? ""} className="input w-auto">
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">
          Filter
        </button>
      </form>

      {teamOrders.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">No team requests match this filter.</div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {teamOrders.map((o: any) => (
            <div key={o.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{o.team?.name ?? "Custom team request"}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Client: {o.client.fullName} · Leader: {o.team?.teamLeader.user.fullName ?? "—"} · £
                  {Number(o.totalEstimateGbp).toLocaleString()} estimate ({o.estimatedWeeks}w)
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="badge">{statusLabels[o.status] ?? o.status}</span>
                <Link href={`/team-orders/${o.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/admin/team-orders" searchParams={{ status: searchParams.status }} />
      </div>
    </div>
  );
}
