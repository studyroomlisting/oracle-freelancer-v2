import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

// FIXED (Milestone 16 gap): "Test Audit Logs" had nothing to test — no
// audit log existed anywhere. This is the read-only viewer; entries are
// created by createAuditLog() at every admin action, never edited or
// deleted through the UI (an audit trail that can be altered after the
// fact isn't one).
export default async function AuditLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">The audit log requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { adminUser: true },
    }),
    prisma.auditLog.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-6">Audit log ({totalCount})</h1>

      {logs.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">No admin actions logged yet.</div>
      ) : (
        <>
          <div className="card divide-y divide-neutral-200">
            {logs.map((log: any) => (
              <div key={log.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="badge">{log.action}</span>
                  <span className="text-xs text-neutral-400">
                    {log.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mt-1">
                  <span className="font-medium">{log.adminUser.fullName}</span> · {log.targetType} <span className="text-neutral-400">{log.targetId.slice(-8)}</span>
                </p>
                {log.details && <p className="text-xs text-neutral-500 mt-1">{log.details}</p>}
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/admin/audit-log" searchParams={{}} />
        </>
      )}
    </div>
  );
}
