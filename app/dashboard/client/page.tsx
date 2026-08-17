import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import GigCard from "@/components/GigCard";
import ProjectLifecycleActions from "@/components/ProjectLifecycleActions";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { calculateClientCompletion } from "@/lib/onboarding";
import { getRecommendedGigs } from "@/lib/queries";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PENDING_ACCEPTANCE: "Awaiting freelancer acceptance",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  IN_REVISION: "In revision",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  REQUESTED: "Awaiting deposit",
  DEPOSIT_PAID: "Deposit paid",
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  OPEN: "Open",
  REJECTED: "Rejected",
  AWARDED: "Awarded",
  CLOSED: "Closed",
};

export default async function ClientDashboard() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  const [orders, teamOrders, projectPostings] = process.env.DATABASE_URL
    ? await Promise.all([
        prisma.order.findMany({
          where: { clientId: session.sub },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { gig: true, gigPackage: true },
        }),
        prisma.teamOrder.findMany({
          where: { clientId: session.sub },
          orderBy: { createdAt: "desc" },
          include: { team: true },
        }),
        prisma.projectPosting.findMany({
          where: { clientId: session.sub },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { applications: true } } },
        }),
      ])
    : [[], [], []];

  const hasNothing = orders.length === 0 && teamOrders.length === 0 && projectPostings.length === 0;
  const currentUser = process.env.DATABASE_URL ? await prisma.user.findUnique({ where: { id: session.sub } }) : null;
  // FIXED (Supabase Auth migration): isVerifiedEmail no longer exists on
  // our own profile row — Supabase is the source of truth for this now
  // (email_confirmed_at on the Supabase Auth user).
  const supabaseUser = (await createServerSupabaseClient().auth.getUser()).data.user;
  const isEmailVerified = !!supabaseUser?.email_confirmed_at;
  const completion = currentUser
    ? calculateClientCompletion({
        fullName: currentUser.fullName,
        companyName: currentUser.companyName,
        companyIndustry: currentUser.companyIndustry,
        companySize: currentUser.companySize,
        avatarUrl: currentUser.avatarUrl,
      })
    : null;
  const recommendedGigs = await getRecommendedGigs(session.sub);

  return (
    <DashboardShell
      role="CLIENT"
      greeting={`Welcome back, ${currentUser?.fullName?.split(" ")[0] ?? "there"} 👋`}
      subtitle="Here's what's happening with your Oracle projects."
      actions={
        <>
          <Link href="/dashboard/payments" className="btn-secondary">
            Payment history
          </Link>
          <Link href="/dashboard/client/profile" className="btn-secondary">
            Company profile
          </Link>
          <Link href="/projects/new" className="btn-primary">
            + Post Requirement
          </Link>
        </>
      }
    >
      <EmailVerificationBanner isVerified={isEmailVerified} />
      {completion && <ProfileCompletionCard percent={completion.percent} missing={completion.missing} editHref="/dashboard/client/profile" />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard icon="🧾" value={orders.length} label="Gig orders" color="green" href="/dashboard/client/orders" />
        <DashboardStatCard icon="👥" value={teamOrders.length} label="Team requests" color="blue" />
        <DashboardStatCard icon="📋" value={projectPostings.length} label="Posted projects" color="orange" href="/projects" />
        <DashboardStatCard
          icon="✅"
          value={projectPostings.filter((p: any) => p.status === "OPEN" || p.status === "AWARDED").length}
          label="Active projects"
          color="purple"
        />
      </div>

      {recommendedGigs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-neutral-900 mb-3">Recommended for you</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendedGigs.map((g) => (
              <GigCard key={g.slug} gig={g} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Your orders</h2>
      </div>

      {hasNothing ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          You haven't ordered anything yet.{" "}
          <Link href="/browse" className="text-brand-600 hover:underline">
            Browse Oracle freelancers
          </Link>{" "}
          or{" "}
          <Link href="/teams" className="text-brand-600 hover:underline">
            explore Project Teams
          </Link>
          .
        </div>
      ) : (
        <>
          {orders.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-neutral-900">Gig orders</h2>
                <Link href="/dashboard/client/orders" className="text-xs font-semibold text-brand-700 hover:underline">
                  View all →
                </Link>
              </div>
              <div className="card divide-y divide-neutral-200 mb-8">
                {orders.map((o: any) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{o.gig.title}</p>
                      <p className="text-xs text-neutral-500">
                        {o.gigPackage.title} · £{(Number(o.totalPriceGbp) + Number(o.clientServiceFeeGbp)).toFixed(2)}
                        {o.scheduledAt && (
                          <span>
                            {" "}· {new Date(o.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UTC
                          </span>
                        )}
                      </p>
                    </div>
                    {o.status === "DELIVERED" ? (
                      <span className="text-xs font-bold text-white bg-brand-500 rounded px-3 py-1.5">
                        {statusLabels[o.status]}
                      </span>
                    ) : (
                      <span className="badge">{statusLabels[o.status] ?? o.status}</span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {teamOrders.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Team requests</h2>
              <div className="card divide-y divide-neutral-200 mb-8">
                {teamOrders.map((o: any) => (
                  <Link key={o.id} href={`/team-orders/${o.id}`} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{o.team ? o.team.name : "Custom Oracle Project Team"}</p>
                      <p className="text-xs text-neutral-500">£{Number(o.totalEstimateGbp).toLocaleString()} estimated · {o.estimatedWeeks} weeks</p>
                    </div>
                    <span className="badge">{statusLabels[o.status] ?? o.status}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {projectPostings.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Your posted projects</h2>
              <div className="card divide-y divide-neutral-200">
                {projectPostings.map((p: any) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                    <Link href={`/projects/${p.slug}`} className="hover:underline">
                      <p className="text-sm font-medium text-neutral-900">{p.title}</p>
                      <p className="text-xs text-neutral-500">{p._count.applications} application{p._count.applications !== 1 ? "s" : ""}</p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="badge">{statusLabels[p.status] ?? p.status}</span>
                      <ProjectLifecycleActions projectId={p.id} status={p.status} applicationCount={p._count.applications} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </DashboardShell>
  );
}
