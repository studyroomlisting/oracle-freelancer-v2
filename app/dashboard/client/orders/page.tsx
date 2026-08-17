import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PENDING_ACCEPTANCE: "Awaiting freelancer acceptance",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export default async function ClientOrderHistoryPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Order history requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const validStatus = searchParams.status && searchParams.status in statusLabels ? searchParams.status : undefined;
  const baseWhere = { clientId: session.sub };
  const where = validStatus ? { ...baseWhere, status: validStatus as any } : baseWhere;

  // FIXED (real gap found during review): every order was already
  // genuinely included regardless of status — cancelled orders were
  // never silently hidden — but there was no way to actually filter down
  // to just one status.
  const [orders, totalCount, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { gig: true, gigPackage: true },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where: baseWhere, _count: true }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const countByStatus: Record<string, number> = Object.fromEntries(statusCounts.map((s: { status: string; _count: number }) => [s.status, s._count]));
  const allCount = Object.values(countByStatus).reduce((sum, n) => sum + n, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/client" className="text-xs text-neutral-500 hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-4">Order history ({totalCount})</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/dashboard/client/orders" className={`text-xs px-3 py-1.5 rounded-full border ${!validStatus ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600"}`}>
          All ({allCount})
        </Link>
        {Object.entries(statusLabels).map(([value, label]) => (
          <Link
            key={value}
            href={`/dashboard/client/orders?status=${value}`}
            className={`text-xs px-3 py-1.5 rounded-full border ${validStatus === value ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600"}`}
          >
            {label} ({countByStatus[value] ?? 0})
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">No orders yet.</div>
      ) : (
        <>
          <div className="card divide-y divide-neutral-200">
            {orders.map((o: any) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{o.gig.title}</p>
                  <p className="text-xs text-neutral-500">
                    {o.gigPackage.title} · £{(Number(o.totalPriceGbp) + Number(o.clientServiceFeeGbp)).toFixed(2)}
                    {o.scheduledAt && (
                      <span> · {new Date(o.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UTC</span>
                    )}
                  </p>
                </div>
                <span className="badge">{statusLabels[o.status] ?? o.status}</span>
              </Link>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/client/orders" searchParams={validStatus ? { status: validStatus } : {}} />
        </>
      )}
    </div>
  );
}
