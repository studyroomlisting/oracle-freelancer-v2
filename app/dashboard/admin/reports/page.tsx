import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getOrdersReport,
  getPaymentReport,
  getFreelancerPerformanceReport,
  getClientActivityReport,
  parseReportRange,
} from "@/lib/analytics";

// FIXED (Milestone 17 gap): real operational reports beyond the
// Milestone 15 dashboard summary cards — filterable by date range, and
// exportable (see the "Export CSV"/"Export PDF" links, which hit
// /api/admin/reports/export with the same range this page is showing).
export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Reports require a connected database.</p>
      </div>
    );
  }

  const range = parseReportRange(searchParams.from, searchParams.to);
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  const [ordersReport, paymentReport, freelancerReport, clientReport] = await Promise.all([
    getOrdersReport(range),
    getPaymentReport(range),
    getFreelancerPerformanceReport(range),
    getClientActivityReport(range),
  ]);

  const exportLink = (type: string, format: "csv" | "pdf") =>
    `/api/admin/reports/export?type=${type}&format=${format}&from=${fromStr}&to=${toStr}`;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-1">Reports</h1>
      <p className="text-sm text-neutral-500 mb-6">{fromStr} to {toStr}</p>

      <form action="/dashboard/admin/reports" className="flex flex-wrap items-end gap-3 mb-8 card p-4">
        <div>
          <label className="text-xs text-neutral-600 block mb-1">From</label>
          <input type="date" name="from" defaultValue={fromStr} className="input" />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">To</label>
          <input type="date" name="to" defaultValue={toStr} className="input" />
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
      </form>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Orders report</h2>
          <div className="flex gap-3 text-xs">
            <a href={exportLink("orders", "csv")} className="text-brand-700 hover:underline">Export CSV</a>
            <a href={exportLink("orders", "pdf")} className="text-brand-700 hover:underline">Export PDF</a>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-700 mb-2">{ordersReport.totalOrders} total orders</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {ordersReport.byStatus.map((s) => (
              <div key={s.status} className="bg-neutral-50 rounded p-2">
                <p className="text-neutral-500">{s.status}</p>
                <p className="font-semibold text-neutral-900">{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Payment report</h2>
          <div className="flex gap-3 text-xs">
            <a href={exportLink("payments", "csv")} className="text-brand-700 hover:underline">Export CSV</a>
            <a href={exportLink("payments", "pdf")} className="text-brand-700 hover:underline">Export PDF</a>
          </div>
        </div>
        <div className="card divide-y divide-neutral-200">
          {paymentReport.byType.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No transactions in this period.</p>
          ) : (
            paymentReport.byType.map((t) => (
              <div key={t.type} className="p-3 flex justify-between text-sm">
                <span>{t.type} ({t.count})</span>
                <span className="font-semibold">£{t.totalGbp.toFixed(2)}</span>
              </div>
            ))
          )}
          {paymentReport.failedPaymentCount > 0 && (
            <p className="p-3 text-xs text-red-600">{paymentReport.failedPaymentCount} failed payment attempt{paymentReport.failedPaymentCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Freelancer performance</h2>
          <div className="flex gap-3 text-xs">
            <a href={exportLink("freelancers", "csv")} className="text-brand-700 hover:underline">Export CSV</a>
            <a href={exportLink("freelancers", "pdf")} className="text-brand-700 hover:underline">Export PDF</a>
          </div>
        </div>
        <div className="card divide-y divide-neutral-200">
          {freelancerReport.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No completed orders in this period.</p>
          ) : (
            freelancerReport.map((f) => (
              <div key={f.slug} className="p-3 flex justify-between text-sm">
                <span>{f.name} · ★{f.ratingAvg.toFixed(1)} ({f.ratingCount})</span>
                <span>{f.completedOrders} orders · £{f.totalEarnedGbp.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Client activity</h2>
          <div className="flex gap-3 text-xs">
            <a href={exportLink("clients", "csv")} className="text-brand-700 hover:underline">Export CSV</a>
            <a href={exportLink("clients", "pdf")} className="text-brand-700 hover:underline">Export PDF</a>
          </div>
        </div>
        <div className="card divide-y divide-neutral-200">
          {clientReport.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No orders placed in this period.</p>
          ) : (
            clientReport.map((c) => (
              <div key={c.email} className="p-3 flex justify-between text-sm">
                <span>{c.name}</span>
                <span>{c.ordersPlaced} orders · £{c.totalSpendGbp.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
