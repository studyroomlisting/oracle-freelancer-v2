import { getPendingGigs, getPendingTeams, getPendingCertifications, getPendingProjectPostings, getDisputedOrders } from "@/lib/queries";
import { getActiveStorageMode } from "@/lib/storage";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PendingGigsList, { type PendingGig } from "@/components/PendingGigsList";
import PendingTeamsList, { type PendingTeam } from "@/components/PendingTeamsList";
import PendingCertificationsList, { type PendingCertification } from "@/components/PendingCertificationsList";
import PendingProjectsList, { type PendingProject } from "@/components/PendingProjectsList";
import DisputedOrdersList, { type DisputedOrder } from "@/components/DisputedOrdersList";
import { getPlatformReport } from "@/lib/analytics";
import EarningsChart from "@/components/EarningsChart";

// FIXED (Milestone 18, CRITICAL — real vulnerability found, not a
// hypothetical): this page had NO role check at all — not even a bare
// session check. Every other admin page (users, gigs, audit-log, reports)
// correctly checks `session.role !== "ADMIN"`, but this was the original
// admin dashboard, built before that pattern was established in this
// codebase, and it was never brought in line. Consequence: the platform-
// level middleware (Phase 39) only confirms a session COOKIE exists for
// any `/dashboard/*` path — it deliberately does not verify the JWT or
// check role (documented reasoning: Edge Runtime can't run the
// jsonwebtoken library used for full verification). That means ANY
// authenticated user — a client or a freelancer, not just an anonymous
// visitor — could navigate to /dashboard/admin and see pending
// gig/team/project/certification approval queues, every open dispute
// (including dispute reasons — potentially sensitive), and platform
// revenue/user-count reports. This is a real broken-access-control bug,
// not a defense-in-depth nicety, and it's fixed the same way every other
// admin page already correctly does it.
export default async function AdminDashboard() {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/auth/login");

  const [pendingGigsRaw, pendingTeamsRaw, pendingCertsRaw, pendingProjectsRaw, disputedOrdersRaw, report] = await Promise.all([
    getPendingGigs(),
    getPendingTeams(),
    getPendingCertifications(),
    getPendingProjectPostings(),
    getDisputedOrders(),
    process.env.DATABASE_URL ? getPlatformReport() : Promise.resolve(null),
  ]);

  const disputedOrders: DisputedOrder[] = disputedOrdersRaw.map((o: any) => ({
    id: o.id,
    gigTitle: o.gig.title,
    clientName: o.client.fullName,
    freelancerName: o.gig.freelancerProfile.user.fullName,
    totalPriceGbp: Number(o.totalPriceGbp),
    disputeReason: o.disputeReason ?? "",
    raisedByName: o.disputeRaisedByUserId === o.clientId ? o.client.fullName : o.gig.freelancerProfile.user.fullName,
  }));

  const pendingProjects: PendingProject[] = pendingProjectsRaw.map((p: any) => ({
    id: p.id,
    title: p.title,
    categoryName: p.category.name,
    clientName: p.client.fullName,
  }));

  const pendingGigs: PendingGig[] = pendingGigsRaw.map((g: any) => ({
    id: g.id,
    title: g.title,
    gigType: g.gigType,
    categoryName: g.category.name,
    freelancerName: g.freelancerProfile.user.fullName,
    createdAt: g.createdAt.toISOString(),
  }));

  const pendingTeams: PendingTeam[] = pendingTeamsRaw.map((t: any) => ({
    id: t.id,
    name: t.name,
    leaderName: t.teamLeader.user.fullName,
    memberCount: t.members.length,
    dailyRateGbp: Number(t.dailyRateGbp),
  }));

  const pendingCerts: PendingCertification[] = pendingCertsRaw.map((c: any) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    freelancerName: c.freelancerProfile.user.fullName,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-neutral-900">Admin</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/reports" className="btn-secondary">
            Reports
          </Link>
          <Link href="/dashboard/admin/gigs" className="btn-secondary">
            Manage gigs
          </Link>
          <Link href="/dashboard/admin/users" className="btn-secondary">
            Manage users
          </Link>
        </div>
      </div>

      {getActiveStorageMode() === "local-disk" && (
        <div className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
          File storage is running on local disk — this breaks on Vercel/serverless. Set the <code>S3_*</code> env vars
          (see <code>.env.example</code>) before deploying there.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-10">
        <div className="card p-5">
          <p className="text-xs text-neutral-500">Pending gig reviews</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{pendingGigs.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-neutral-500">Pending project reviews</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{pendingProjects.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-neutral-500">Pending team reviews</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{pendingTeams.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-neutral-500">Certification requests</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{pendingCerts.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-neutral-500">Open disputes</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{disputedOrders.length}</p>
        </div>
      </div>

      {report && (
        <>
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Platform reports</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="card p-4">
              <p className="text-xs text-neutral-500">Total users</p>
              <p className="text-xl font-semibold text-neutral-900">{report.totalUsers}</p>
              <p className="text-[11px] text-neutral-400">{report.totalFreelancers} freelancers · {report.totalClients} clients</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-neutral-500">Total orders</p>
              <p className="text-xl font-semibold text-neutral-900">{report.totalOrders}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-neutral-500">Platform revenue (6mo)</p>
              <p className="text-xl font-semibold text-neutral-900">£{report.totalRevenueGbp.toFixed(2)}</p>
              <p className="text-[11px] text-neutral-400">20% commission on completed payments</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-neutral-500">Open disputes</p>
              <p className="text-xl font-semibold text-neutral-900">{report.openDisputes}</p>
            </div>
          </div>
          <div className="card p-4 mb-10">
            <p className="text-sm font-bold text-neutral-900 mb-2">Revenue, last 6 months</p>
            <EarningsChart data={report.monthlyRevenue} />
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-neutral-900 mb-3">Open disputes</h2>
      <DisputedOrdersList initialOrders={disputedOrders} />

      <h2 className="text-sm font-semibold text-neutral-900 mt-10 mb-3">Pending gig approvals</h2>
      <PendingGigsList initialGigs={pendingGigs} />

      <h2 className="text-sm font-semibold text-neutral-900 mt-10 mb-3">Pending project approvals</h2>
      <PendingProjectsList initialProjects={pendingProjects} />

      <h2 className="text-sm font-semibold text-neutral-900 mt-10 mb-3">Pending team approvals</h2>
      <PendingTeamsList initialTeams={pendingTeams} />

      <h2 className="text-sm font-semibold text-neutral-900 mt-10 mb-3">Certification verification</h2>
      <PendingCertificationsList initialCertifications={pendingCerts} />
    </div>
  );
}
