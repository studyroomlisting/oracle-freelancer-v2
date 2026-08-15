import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeaturedGigsList, { type ManageableGig } from "@/components/FeaturedGigsList";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

export default async function AdminManageGigsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Gig management requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = {
    status: "ACTIVE" as const,
    isProjectEngagement: false,
    ...(searchParams.q ? { title: { contains: searchParams.q, mode: "insensitive" as const } } : {}),
  };

  const [gigs, totalCount] = await Promise.all([
    prisma.gig.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true, freelancerProfile: { include: { user: true } } },
    }),
    prisma.gig.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const manageableGigs: ManageableGig[] = gigs.map((g: any) => ({
    id: g.id,
    title: g.title,
    gigType: g.gigType,
    categoryName: g.category.name,
    freelancerName: g.freelancerProfile.user.fullName,
    isFeatured: g.isFeatured,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/admin" className="text-xs text-neutral-500 hover:underline">← Admin dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-1">Manage active gigs</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {totalCount} active gig{totalCount !== 1 ? "s" : ""} — featured gigs show first on the homepage.
      </p>

      <form action="/dashboard/admin/gigs" className="flex mb-6 border border-neutral-900 rounded overflow-hidden max-w-sm">
        <input name="q" defaultValue={searchParams.q} className="flex-1 border-none px-3 py-2 text-sm outline-none" placeholder="Search by title" />
        <button type="submit" className="bg-neutral-900 text-white px-3.5" aria-label="Search">🔍</button>
      </form>

      <FeaturedGigsList initialGigs={manageableGigs} />
      <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/admin/gigs" searchParams={{ q: searchParams.q }} />
    </div>
  );
}
