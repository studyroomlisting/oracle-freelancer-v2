import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ApplyToProjectForm from "@/components/ApplyToProjectForm";
import ApplicationsList from "@/components/ApplicationsList";
import { sampleProjectPostings } from "@/lib/sampleData";

export default async function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession();

  if (!process.env.DATABASE_URL) {
    const sample = sampleProjectPostings.find((p) => p.slug === params.slug);
    if (!sample) notFound();
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/projects" className="text-xs text-neutral-500 hover:underline">← Open Oracle projects</Link>
        <p className="text-xs text-brand-700 font-semibold mt-2 mb-1">{sample.categoryName}</p>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">{sample.title}</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600 mb-6">
          <span className="badge">Open</span>
          <span>Budget: £{sample.budgetMinGbp.toLocaleString()}–£{sample.budgetMaxGbp.toLocaleString()}</span>
          <span>{sample.timelineWeeks} weeks</span>
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed mb-8">{sample.description}</p>
        <div className="card p-5 text-sm text-neutral-500 text-center">
          Connect a live database to apply to projects or post your own.
        </div>
      </div>
    );
  }

  const posting = await prisma.projectPosting.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      client: true,
      attachments: true,
      applications: {
        include: {
          freelancerProfile: { include: { user: true } },
          team: { include: { teamLeader: { include: { user: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!posting) notFound();

  // FIXED (Milestone 6 gap): this page previously had no status or
  // ownership check at all — a DRAFT, PENDING_REVIEW, or REJECTED posting
  // (none of which are meant to be public yet) was fully visible to
  // anyone who knew or guessed its slug. Same bug class already fixed for
  // gig visibility (Phase 34) and freelancer profile visibility
  // (Phase 31) — deliberately a 404 rather than "this project isn't public
  // yet", since confirming a hidden slug exists is its own small leak.
  const isOwner = session?.sub === posting.clientId;
  if (posting.status !== "OPEN" && posting.status !== "AWARDED" && posting.status !== "CLOSED" && !isOwner) {
    notFound();
  }

  const awardedApplication = posting.awardedApplicationId
    ? posting.applications.find((a: any) => a.id === posting.awardedApplicationId)
    : null;

  const myFreelancerProfile = session
    ? await prisma.freelancerProfile.findUnique({ where: { userId: session.sub } })
    : null;
  const myLedTeams = myFreelancerProfile
    ? await prisma.team.findMany({ where: { teamLeaderId: myFreelancerProfile.id, status: "ACTIVE" } })
    : [];

  const alreadyApplied = myFreelancerProfile
    ? posting.applications.some(
        (a: any) => a.freelancerProfileId === myFreelancerProfile.id || (a.teamId && myLedTeams.some((t: any) => t.id === a.teamId))
      )
    : false;

  const applications = posting.applications.map((a: any) => ({
    id: a.id,
    coverLetter: a.coverLetter,
    proposedPriceGbp: Number(a.proposedPriceGbp),
    proposedWeeks: a.proposedWeeks,
    status: a.status,
    applicantName: a.teamId ? `${a.team!.name} (Team)` : a.freelancerProfile!.user.fullName,
    applicantSlug: a.teamId ? null : a.freelancerProfile!.slug,
    applicantHref: a.teamId ? `/teams/${a.team!.slug}` : `/freelancers/${a.freelancerProfile!.slug}`,
    ratingAvg: a.teamId ? Number(a.team!.teamScore) : Number(a.freelancerProfile!.ratingAvg),
    isTeam: !!a.teamId,
  }));

  const awardedOrderId = awardedApplication?.resultingOrderId ?? null;
  const awardedTeamOrderId = awardedApplication?.resultingTeamOrderId ?? null;
  const awardedViewerCanSee =
    awardedApplication &&
    (session?.sub === posting.clientId ||
      session?.sub === awardedApplication.freelancerProfile?.userId ||
      session?.sub === awardedApplication.team?.teamLeader.userId);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/projects" className="text-xs text-neutral-500 hover:underline">← Open Oracle projects</Link>
      <p className="text-xs text-brand-700 font-semibold mt-2 mb-1">{posting.category.name}</p>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">{posting.title}</h1>
      <div className="flex items-center gap-4 text-sm text-neutral-600 mb-6">
        <span className="badge">{posting.status.charAt(0) + posting.status.slice(1).toLowerCase()}</span>
        {(posting.budgetMinGbp || posting.budgetMaxGbp) && (
          <span>
            Budget: £{Number(posting.budgetMinGbp ?? 0).toLocaleString()}
            {posting.budgetMaxGbp ? `–£${Number(posting.budgetMaxGbp).toLocaleString()}` : "+"}
          </span>
        )}
        {posting.timelineWeeks && <span>{posting.timelineWeeks} weeks</span>}
      </div>

      {/* ADDED (real gap found during review): the client who posted this
          — name, avatar, and when — was fetched (`client: true` in the
          query above) but never rendered anywhere on this page. Same
          avatar-with-fallback pattern used everywhere else on the
          platform (real photo if set, initial-letter circle otherwise). */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-neutral-200">
        <div className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
          {posting.client.avatarUrl ? (
            <img src={posting.client.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            posting.client.fullName.charAt(0)
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {posting.client.fullName}
            {posting.client.companyName ? ` · ${posting.client.companyName}` : ""}
          </p>
          <p className="text-xs text-neutral-500">
            Posted {new Date(posting.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <p className="text-sm text-neutral-700 leading-relaxed mb-8">{posting.description}</p>

      {(posting.businessProcess || posting.environment || posting.errorCode || posting.priority || posting.severity || posting.tags) && (
        <div className="card p-5 mb-8">
          <h2 className="text-sm font-bold text-neutral-900 mb-3">Oracle issue details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
            {posting.businessProcess && (
              <div><p className="text-xs text-neutral-500">Business process</p><p className="text-neutral-900">{posting.businessProcess}{posting.subProcess ? ` → ${posting.subProcess}` : ""}</p></div>
            )}
            {posting.oracleVersion && (
              <div><p className="text-xs text-neutral-500">Oracle version</p><p className="text-neutral-900">{posting.oracleVersion}</p></div>
            )}
            {posting.environment && (
              <div><p className="text-xs text-neutral-500">Environment</p><p className="text-neutral-900">{posting.environment}</p></div>
            )}
            {posting.errorCode && (
              <div><p className="text-xs text-neutral-500">Error code</p><p className="text-neutral-900">{posting.errorCode}</p></div>
            )}
            {posting.priority && (
              <div><p className="text-xs text-neutral-500">Priority</p><p className="text-neutral-900">{posting.priority}</p></div>
            )}
            {posting.severity && (
              <div><p className="text-xs text-neutral-500">Severity</p><p className="text-neutral-900">{posting.severity}</p></div>
            )}
            {posting.pricingType && (
              <div><p className="text-xs text-neutral-500">Pricing</p><p className="text-neutral-900">{posting.pricingType === "FIXED" ? "Fixed price" : "Hourly"}</p></div>
            )}
          </div>
          {posting.errorMessage && <p className="text-xs text-neutral-600 mb-2"><span className="font-semibold">Error message:</span> {posting.errorMessage}</p>}
          {posting.stepsToReproduce && <p className="text-xs text-neutral-600 mb-2"><span className="font-semibold">Steps to reproduce:</span> {posting.stepsToReproduce}</p>}
          {posting.expectedBehaviour && <p className="text-xs text-neutral-600 mb-2"><span className="font-semibold">Expected:</span> {posting.expectedBehaviour}</p>}
          {posting.actualBehaviour && <p className="text-xs text-neutral-600 mb-2"><span className="font-semibold">Actual:</span> {posting.actualBehaviour}</p>}
          {posting.tags && <p className="text-xs text-neutral-500 mt-2">Tags: {posting.tags}</p>}
          {posting.attachments && posting.attachments.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-neutral-700 mb-1">Attachments</p>
              <div className="flex flex-col gap-1">
                {posting.attachments.map((a: any) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                    📎 {a.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {awardedApplication && (awardedOrderId || awardedTeamOrderId) && awardedViewerCanSee && (
        <div className="card p-4 mb-8 flex items-center justify-between">
          <p className="text-sm text-neutral-700">
            Awarded to{" "}
            <span className="font-semibold">
              {awardedApplication.teamId ? `${awardedApplication.team!.name} (Team)` : awardedApplication.freelancerProfile!.user.fullName}
            </span>{" "}
            — {awardedTeamOrderId ? "a team engagement request" : "an order"} was created automatically.
          </p>
          <Link href={awardedTeamOrderId ? `/team-orders/${awardedTeamOrderId}` : `/orders/${awardedOrderId}`} className="btn-secondary text-xs shrink-0">
            {awardedTeamOrderId ? "View request" : "View order"}
          </Link>
        </div>
      )}

      {isOwner ? (
        <>
          {/* FIXED (real gap found during review): the owner previously
              always saw "Applications (0)" regardless of WHY there were
              none — pending admin review, rejected, or genuinely live
              with no applicants yet are three very different situations,
              and the client had no way to tell them apart on this page.
              Worst case: a rejected posting's actual reason (stored in
              the database, emailed once) was never shown here at all —
              if that email was missed or deleted, there was no way to
              find out why, or what to do about it. */}
          {posting.status === "PENDING_REVIEW" && (
            <div className="card p-5 text-sm text-neutral-600 mb-6 bg-neutral-50">
              This project is awaiting admin approval — it isn't visible to freelancers yet. Usually reviewed within
              24 hours.
            </div>
          )}
          {posting.status === "REJECTED" && (
            <div className="card p-5 text-sm mb-6 bg-red-50 border-red-100">
              <p className="font-semibold text-neutral-900 mb-1">This project wasn't approved</p>
              {posting.rejectionReason && <p className="text-neutral-700 mb-3">{posting.rejectionReason}</p>}
              <Link href={`/dashboard/client/projects/${posting.id}/edit`} className="text-brand-600 hover:underline font-semibold">
                Edit and resubmit →
              </Link>
            </div>
          )}
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Applications ({applications.length})</h2>
          <ApplicationsList projectId={posting.id} initialApplications={applications} canDecide={posting.status === "OPEN"} />
        </>
      ) : (
        <>
          {!session && (
            <div className="card p-5 text-sm text-neutral-600">
              <Link href="/auth/login" className="text-brand-600 hover:underline font-semibold">
                Sign in
              </Link>{" "}
              as a freelancer to apply to this project.
            </div>
          )}
          {session && !myFreelancerProfile && (
            <div className="card p-5 text-sm text-neutral-600">Only freelancer accounts can apply to projects.</div>
          )}
          {myFreelancerProfile && posting.status !== "OPEN" && (
            <div className="card p-5 text-sm text-neutral-600">This project is no longer accepting applications.</div>
          )}
          {myFreelancerProfile && posting.status === "OPEN" && alreadyApplied && (
            <div className="card p-5 text-sm text-brand-700 bg-brand-50">You've already applied to this project (as yourself or a team you lead).</div>
          )}
          {myFreelancerProfile && posting.status === "OPEN" && !alreadyApplied && (
            <ApplyToProjectForm projectId={posting.id} myLedTeams={myLedTeams.map((t: any) => ({ id: t.id, name: t.name }))} />
          )}
        </>
      )}
    </div>
  );
}
