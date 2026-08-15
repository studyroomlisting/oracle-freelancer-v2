import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserManagementActions from "@/components/UserManagementActions";
import CreateUserForm from "@/components/CreateUserForm";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">User management requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = searchParams.q
    ? {
        OR: [
          { fullName: { contains: searchParams.q, mode: "insensitive" as const } },
          { email: { contains: searchParams.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, fullName: true, email: true, role: true, isSuspended: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <div className="flex items-center justify-between mt-2 mb-6 flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Users ({totalCount})</h1>
        <Link href="/dashboard/admin/audit-log" className="text-xs font-semibold text-brand-700 hover:underline">
          View audit log →
        </Link>
      </div>

      <CreateUserForm />

      <form action="/dashboard/admin/users" className="flex mb-6 border border-neutral-900 rounded overflow-hidden max-w-sm">
        <input name="q" defaultValue={searchParams.q} className="flex-1 border-none px-3 py-2 text-sm outline-none" placeholder="Search name or email" />
        <button type="submit" className="bg-neutral-900 text-white px-3.5" aria-label="Search">🔍</button>
      </form>

      <div className="card divide-y divide-neutral-200">
        {users.map((u: { id: string; fullName: string; email: string; role: string; isSuspended: boolean }) => (
          <div key={u.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{u.fullName}</p>
              <p className="text-xs text-neutral-500">{u.email} · {u.role}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="badge">{u.isSuspended ? "Suspended" : "Active"}</span>
              <UserManagementActions user={u} />
            </div>
          </div>
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/admin/users" searchParams={{ q: searchParams.q }} />
    </div>
  );
}
