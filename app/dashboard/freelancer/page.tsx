import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SubmitCertificationForm from "@/components/SubmitCertificationForm";
import MyApplicationRow from "@/components/MyApplicationRow";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import GigLifecycleActions from "@/components/GigLifecycleActions";
import BoostGigButton from "@/components/BoostGigButton";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import { calculateFreelancerCompletion } from "@/lib/onboarding";
import { getWalletSummary, calculateAvailableBalance } from "@/lib/wallet";
import { getFreelancerEarningsByMonth } from "@/lib/analytics";
import EarningsChart from "@/components/EarningsChart";

const gigStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Active",
  PAUSED: "Paused",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const gigTypeLabels: Record<string, string> = {
  CONSULTING: "Consulting",
  TRAINING: "Training",
  WORKSHOP: "Workshop",
};

const teamOrderStatusLabels: Record<string, string> = {
  REQUESTED: "Awaiting deposit",
  DEPOSIT_PAID: "Deposit paid — scoping call next",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function FreelancerDashboard({
  searchParams,
}: {
  searchParams: { created?: string; teamCreated?: string };
}) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let gigs: any[] = [];
  let orders: any[] = [];
  let teamsLed: any[] = [];
  let teamMemberships: any[] = [];
  let projectApplications: any[] = [];
  let teamOrders: any[] = [];

  if (process.env.DATABASE_URL) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.sub },
      include: {
        gigs: { include: { packages: true }, orderBy: { createdAt: "desc" } },
        teamsLed: { include: { members: true }, orderBy: { createdAt: "desc" } },
        teamMemberships: { include: { team: true } },
      },
    });
    if (profile) {
      gigs = profile.gigs;
      teamsLed = profile.teamsLed;
      teamMemberships = profile.teamMemberships.filter((m: any) => m.team.teamLeaderId !== profile.id);
      orders = await prisma.order.findMany({
        where: { gig: { freelancerProfileId: profile.id } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { gig: true, gigPackage: true },
      });
      // ADDED (real gap found during review): a client requesting a team
      // (prebuilt or custom) sends the team leader an email + in-app
      // notification, but there was no persistent place on the dashboard
      // to find that request again afterward — the notification/email
      // link was the ONLY path in, and once dismissed or missed, the
      // leader had no way back to /team-orders/[id] or its workspace.
      // Mirrors the existing "Recent orders" pattern for individual gigs.
      teamOrders = await prisma.teamOrder.findMany({
        where: { teamId: { in: teamsLed.map((t: any) => t.id) } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { team: true, client: true },
      });
      projectApplications = await prisma.projectApplication.findMany({
        where: {
          OR: [{ freelancerProfileId: profile.id }, { team: { teamLeaderId: profile.id } }],
        },
        orderBy: { createdAt: "desc" },
        include: { projectPosting: true, team: true },
      });
    }
  }

  const currentUser = process.env.DATABASE_URL ? await prisma.user.findUnique({ where: { id: session.sub } }) : null;
  // FIXED (Supabase Auth migration): isVerifiedEmail no longer exists on
  // our own profile row — Supabase is the source of truth for this now.
  const supabaseUser = (await createServerSupabaseClient().auth.getUser()).data.user;
  const isEmailVerified = !!supabaseUser?.email_confirmed_at;
  const completionProfile = process.env.DATABASE_URL ? await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } }) : null;
  const completion = completionProfile
    ? calculateFreelancerCompletion({
        headline: completionProfile.headline,
        bio: completionProfile.bio,
        oracleModules: completionProfile.oracleModules,
        yearsExperience: completionProfile.yearsExperience,
        hourlyRateGbp: completionProfile.hourlyRateGbp ? Number(completionProfile.hourlyRateGbp) : null,
        avatarUrl: currentUser?.avatarUrl ?? null,
        resumeUrl: completionProfile.resumeUrl,
      })
    : null;
  const walletSummary = process.env.DATABASE_URL ? await getWalletSummary(session.sub) : null;
  const walletAvailable = walletSummary ? calculateAvailableBalance(walletSummary) : 0;
  const earningsByMonth = process.env.DATABASE_URL ? await getFreelancerEarningsByMonth(session.sub) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <EmailVerificationBanner isVerified={isEmailVerified} />
      {completion && <ProfileCompletionCard percent={completion.percent} missing={completion.missing} editHref="/dashboard/freelancer/profile" />}
      {walletSummary && (
        <Link href="/dashboard/payments" className="card p-4 mb-6 flex items-center justify-between hover:bg-neutral-50">
          <div>
            <p className="text-xs text-neutral-500">Available balance</p>
            <p className="text-xl font-bold text-brand-700">£{walletAvailable.toFixed(2)}</p>
          </div>
          <span className="text-xs font-semibold text-brand-700">View wallet →</span>
        </Link>
      )}
      {earningsByMonth && (
        <div className="card p-4 mb-6">
          <p className="text-sm font-bold text-neutral-900 mb-2">Earnings, last 6 months</p>
          <EarningsChart data={earningsByMonth} />
        </div>
      )}
      {searchParams.created && (
        <div className="mb-6 text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded p-3">
          Gig submitted — it'll show below once an admin approves it.
        </div>
      )}
      {searchParams.teamCreated && (
        <div className="mb-6 text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded p-3">
          Team submitted — it'll show below once an admin approves it.
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Your gigs</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/payments" className="btn-secondary">
            Payment history
          </Link>
          <Link href="/projects" className="btn-secondary">
            Browse projects
          </Link>
          <Link href="/dashboard/freelancer/profile" className="btn-secondary">
            Edit profile
          </Link>
          <Link href="/dashboard/freelancer/subscription" className="btn-secondary">
            Subscription
          </Link>
          <Link href="/dashboard/freelancer/availability" className="btn-secondary">
            Availability
          </Link>
          <Link href="/dashboard/freelancer/gigs/new" className="btn-primary">
            Create gig
          </Link>
        </div>
      </div>

      {gigs.length === 0 ? (
        <div className="card p-6 text-sm text-center">
          {/* FIXED (real gap found during review): a bare public profile
              alone doesn't make a freelancer discoverable or bookable at
              all — search only surfaces gigs, and booking only happens
              through a gig's packages, never directly from a profile. The
              old message here ("You haven't created any gigs yet") was
              true but didn't communicate that stakes at all — a new
              freelancer could easily finish onboarding, see their public
              profile, and reasonably believe they were done. */}
          <p className="text-neutral-700 font-medium mb-1">You're not visible to clients yet</p>
          <p className="text-neutral-500 mb-4">
            Your profile is public, but clients find and book freelancers through gigs, not profiles directly —
            create your first one to start appearing in search.
          </p>
          <Link href="/dashboard/freelancer/gigs/new" className="btn-primary inline-flex w-auto px-6">
            Create your first gig
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {gigs.map((g) => (
            <div key={g.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{g.title}</p>
                  <span className="badge">{gigTypeLabels[g.gigType] ?? g.gigType}</span>
                  {g.isProjectEngagement && <span className="badge-certified">From awarded project</span>}
                </div>
                <p className="text-xs text-neutral-500">
                  {gigStatusLabels[g.status] ?? g.status} · {g.packages.length} package{g.packages.length !== 1 ? "s" : ""}
                  {g.packages.length > 0 && ` · £${Math.min(...g.packages.map((p: any) => Number(p.priceGbp)))}–£${Math.max(...g.packages.map((p: any) => Number(p.priceGbp)))}`}
                  {g.gigType === "WORKSHOP" && g.maxSeats != null && (
                    <span className={g.seatsBooked >= g.maxSeats ? "text-red-600 font-semibold" : ""}>
                      {" "}· {g.seatsBooked}/{g.maxSeats} seats booked
                    </span>
                  )}
                  {g.gigType === "WORKSHOP" && g.sessionStartAt && (
                    <span> · {new Date(g.sessionStartAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="badge">{gigStatusLabels[g.status] ?? g.status}</span>
                {g.status === "ACTIVE" && <BoostGigButton gigId={g.id} boostedUntil={g.boostedUntil ? new Date(g.boostedUntil).toISOString() : null} />}
                <GigLifecycleActions gigId={g.id} status={g.status} isProjectEngagement={g.isProjectEngagement} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-10 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Teams you lead</h2>
        <Link href="/dashboard/freelancer/teams/new" className="btn-secondary text-sm">
          Create team
        </Link>
      </div>
      {teamsLed.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          You're not leading any teams yet — create one to offer coordinated project delivery instead of solo gigs.
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {teamsLed.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">{t.name}</p>
                <p className="text-xs text-neutral-500">{t.members.length} members · £{Number(t.dailyRateGbp).toLocaleString()}/day</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/freelancer/teams/${t.id}/roster`} className="text-xs font-semibold text-brand-700 hover:underline">
                  Manage roster
                </Link>
                <span className="badge">{gigStatusLabels[t.status] ?? t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-10 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Team engagement requests</h2>
      </div>
      {teamOrders.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          No client requests yet — when a client requests one of your teams, it'll show up here.
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {teamOrders.map((o: any) => (
            <div key={o.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{o.team?.name ?? "Custom team request"}</p>
                <p className="text-xs text-neutral-500">
                  {o.client.fullName} · £{Number(o.totalEstimateGbp).toLocaleString()} estimate
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge">{teamOrderStatusLabels[o.status] ?? o.status}</span>
                <Link href={`/team-orders/${o.id}`} className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded px-3 py-1.5">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {teamMemberships.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-neutral-900 mt-10 mb-4">Teams you're a member of</h2>
          <div className="card divide-y divide-neutral-200">
            {teamMemberships.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{m.team.name}</p>
                  <p className="text-xs text-neutral-500">{m.roleLabel}</p>
                </div>
                <span className="badge">{gigStatusLabels[m.team.status] ?? m.team.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold text-neutral-900 mt-10 mb-4">Your project applications</h2>
      {projectApplications.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          No applications yet — <Link href="/projects" className="text-brand-600 hover:underline">browse open projects</Link>.
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {projectApplications.map((a: any) => (
            <MyApplicationRow
              key={a.id}
              projectSlug={a.projectPosting.slug}
              projectId={a.projectPostingId}
              applicationId={a.id}
              title={a.projectPosting.title}
              priceGbp={Number(a.proposedPriceGbp)}
              weeks={a.proposedWeeks}
              status={a.status}
              teamName={a.team?.name}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-10 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Recent orders</h2>
        <Link href="/dashboard/freelancer/orders" className="text-sm font-semibold text-brand-700 hover:underline">
          View all →
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          No orders yet — orders will appear here once a client checks out on one of your gigs.
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {orders.map((o) => (
            <div key={o.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">{o.gig.title}</p>
                <p className="text-xs text-neutral-500">
                  {o.gigPackage.title} · £{Number(o.totalPriceGbp).toFixed(2)}
                  {o.scheduledAt && (
                    <span>
                      {" "}· {new Date(o.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UTC
                    </span>
                  )}
                </p>
              </div>
              {/* FIXED (real gap found during review): every order status
                  used to get the exact same plain gray badge — an order
                  awaiting the freelancer's acceptance looked identical to
                  a routine in-progress one, with no visual urgency and no
                  direct way to act on it from the dashboard itself. */}
              {o.status === "PENDING_ACCEPTANCE" ? (
                <Link href={`/orders/${o.id}`} className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded px-3 py-1.5">
                  Review &amp; respond →
                </Link>
              ) : (
                <span className="badge">{o.status.replace("_", " ")}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <h2 className="text-lg font-semibold text-neutral-900 mt-10 mb-4">Certifications</h2>
      <p className="text-xs text-neutral-500 mb-3">
        Submitted certifications appear on your public profile once an admin verifies them — this is what unlocks the
        "Oracle Certified" badge.
      </p>
      <SubmitCertificationForm />
    </div>
  );
}
