import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

const typeIcons: Record<string, string> = {
  order: "📦",
  payment: "💷",
  message: "💬",
  dispute: "⚠️",
  milestone: "✅",
  wallet: "🏦",
  gig: "🛠️",
  team: "👥",
  project: "📋",
  certification: "🎓",
  subscription: "⭐",
};

// FIXED (Milestone 14 gap): "Test Notification History" had nothing to
// test — there was no in-app notification system at all before this
// phase. Full paginated history, distinct from the bell dropdown's
// small recent-8 preview.
export default async function NotificationHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Notification history requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = { userId: session.sub };

  const [notifications, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const dashboardHref = session.role === "FREELANCER" ? "/dashboard/freelancer" : session.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/client";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href={dashboardHref} className="text-xs text-neutral-500 hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">No notifications yet.</div>
      ) : (
        <>
          <div className="card divide-y divide-neutral-200">
            {notifications.map((n: any) => {
              const inner = (
                <div className={`p-4 flex gap-3 ${!n.readAt ? "bg-brand-50" : ""}`}>
                  <span>{typeIcons[n.type] ?? "🔔"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{n.title}</p>
                    <p className="text-sm text-neutral-600">{n.body}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {n.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
              return n.linkUrl ? (
                <Link key={n.id} href={n.linkUrl} className="block hover:bg-neutral-50">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/notifications" searchParams={{}} />
        </>
      )}
    </div>
  );
}
