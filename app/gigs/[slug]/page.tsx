import { sampleGigs } from "@/lib/sampleData";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import PackageTabs from "@/components/PackageTabs";
import WorkshopBooking from "@/components/WorkshopBooking";
import OnlineStatusBadge from "@/components/OnlineStatusBadge";
import type { Metadata } from "next";

async function getGig(slug: string) {
  if (process.env.DATABASE_URL) {
    try {
      const gig = await prisma.gig.findUnique({
        where: { slug },
        include: {
          category: true,
          freelancerProfile: { include: { user: true, certifications: true } },
          packages: { orderBy: { priceGbp: "asc" } },
          faqItems: { orderBy: { displayOrder: "asc" } },
          extras: { orderBy: { displayOrder: "asc" } },
        },
      });
      if (gig) return gig;
    } catch {
      // fall through to sample data below
    }
  }
  const sample = sampleGigs.find((g) => g.slug === slug);
  if (!sample) return null;
  return {
    id: `sample-gig-${sample.slug}`,
    faqItems: [] as { id: string; question: string; answer: string }[],
    extras: [] as { id: string; title: string; description: string; priceGbp: number; extraDeliveryDays: number | null }[],
    title: sample.title,
    description: sample.description,
    portfolioNote: sample.portfolioNote,
    gigType: sample.gigType,
    sessionStartAt: sample.sessionStartAt ? new Date(sample.sessionStartAt) : null,
    sessionEndAt: sample.sessionEndAt ? new Date(sample.sessionEndAt) : null,
    maxSeats: sample.maxSeats ?? null,
    seatsBooked: sample.seatsBooked ?? 0,
    category: { name: sample.categoryName, slug: sample.categoryName.toLowerCase().replace(/\s+/g, "-") },
    freelancerProfile: {
      slug: sample.freelancerSlug,
      sellerLevel: sample.sellerLevel,
      isCertified: sample.isCertified,
      ratingAvg: sample.ratingAvg,
      ratingCount: sample.ratingCount,
      user: { id: `sample-user-${sample.freelancerSlug}`, fullName: sample.freelancerName },
      certifications: [],
    },
    packages:
      sample.gigType === "WORKSHOP"
        ? []
        : [
            { id: `sample-basic-${sample.slug}`, tier: "BASIC", title: "Basic", description: "Core scope, single revision.", priceGbp: sample.fromPriceGbp, deliveryDays: 5, revisions: 1, sessionDurationMinutes: 60 },
            { id: `sample-standard-${sample.slug}`, tier: "STANDARD", title: "Standard", description: "Extended scope, two revisions.", priceGbp: sample.fromPriceGbp * 1.8, deliveryDays: 7, revisions: 2, sessionDurationMinutes: 90 },
            { id: `sample-premium-${sample.slug}`, tier: "PREMIUM", title: "Premium", description: "Full scope with documentation & handover call.", priceGbp: sample.fromPriceGbp * 3, deliveryDays: 10, revisions: 3, sessionDurationMinutes: 120 },
          ],
    workshopPackageId: sample.gigType === "WORKSHOP" ? `sample-workshop-${sample.slug}` : undefined,
    workshopPriceGbp: sample.gigType === "WORKSHOP" ? sample.fromPriceGbp : undefined,
  };
}

const sampleFaqs = [
  { q: "Do you work directly in our Oracle instance?", a: "Yes — I work in your sandbox/test environment first, then support migration to production once you approve the configuration." },
  { q: "What do you need from us to get started?", a: "Read access to the relevant environment, a point of contact for business rules, and any existing process documentation you have." },
  { q: "Can you extend scope beyond the package?", a: "Yes, extra requirements can be added as a custom offer after we scope the gap together." },
];

const sampleReviews = [
  { author: "Mark T.", rating: 5, text: "Delivered exactly to spec and explained every configuration choice clearly. Would hire again for the next phase." },
  { author: "Sophie L.", rating: 5, text: "Communicated proactively, flagged a data issue before it became a problem. Excellent technical depth." },
  { author: "Rahul D.", rating: 4, text: "Solid delivery, one revision needed for a naming convention mismatch but resolved same day." },
];

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const gig = await getGig(params.slug);
  if (!gig) return { title: "Gig not found — OracleGigs" };
  const description = gig.description.slice(0, 155);
  return {
    title: `${gig.title} — OracleGigs`,
    description,
    openGraph: { title: gig.title, description, type: "website" },
  };
}

export default async function GigDetailPage({ params }: { params: { slug: string } }) {
  const gig: any = await getGig(params.slug);
  if (!gig) notFound();

  // FIXED (Milestone 18 security review, real vulnerability, currently
  // live — not hypothetical): this page had NO status check at all, only
  // existence. A DRAFT, PENDING_REVIEW, PAUSED, REJECTED, or ARCHIVED gig
  // was fully visible to anyone who knew or guessed its slug, including
  // anonymous visitors. This is the same "leaked non-public listing"
  // pattern already correctly fixed for freelancer profiles (Phase 31)
  // and project postings (Phase 47) — but it turns out this exact page
  // either never actually got that fix applied, or a later change (the
  // Milestone 4 gig-lifecycle rewrite touched this same file's data
  // shape extensively) silently dropped it. Either way, it's a real,
  // present-tense gap being closed now, not one already covered — a
  // 404 (not a "this gig isn't public yet" message) for anyone who isn't
  // the owning freelancer.
  const session = await getServerSession();
  const isOwner = session?.sub === gig.freelancerProfile?.userId;
  if (gig.status && gig.status !== "ACTIVE" && !isOwner) {
    notFound();
  }

  const isWorkshop = gig.gigType === "WORKSHOP";

  const otherGigs =
    process.env.DATABASE_URL && gig.freelancerProfile?.id
      ? await prisma.gig.findMany({
          where: { freelancerProfileId: gig.freelancerProfile.id, status: "ACTIVE", isProjectEngagement: false, id: { not: gig.id } },
          include: { packages: { orderBy: { priceGbp: "asc" }, take: 1 } },
          take: 4,
        })
      : [];

  return (
    <>
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <div>
          <div className="text-xs text-neutral-500">
            <Link href="/" className="hover:underline">OracleGigs</Link> &nbsp;›&nbsp;{" "}
            <Link href={`/browse?category=${gig.category.slug}`} className="hover:underline">{gig.category.name}</Link>
            {isWorkshop && <> &nbsp;›&nbsp; <Link href="/workshops" className="hover:underline">Workshops</Link></>}
            {gig.gigType === "TRAINING" && <> &nbsp;›&nbsp; <Link href="/trainers" className="hover:underline">Trainers</Link></>}
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-neutral-900 mt-2 mb-5">{gig.title}</h1>
          <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-neutral-200">
            <div className="w-9 h-9 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm font-semibold">
              {gig.freelancerProfile.user.fullName.charAt(0)}
            </div>
            <div>
              <Link href={`/freelancers/${gig.freelancerProfile.slug}`} className="text-sm font-bold text-neutral-900 hover:underline">
                {gig.freelancerProfile.user.fullName}
              </Link>
              {"sellerLevel" in gig.freelancerProfile && (
                <p className="text-xs text-neutral-500">{(gig.freelancerProfile as any).sellerLevel}</p>
              )}
            </div>
            {gig.freelancerProfile.isCertified && <span className="badge-certified">✓ Oracle Certified</span>}
            <span className="ml-auto text-sm text-neutral-600">
              <span className="stars">★★★★★</span> <b className="text-neutral-900">{Number(gig.freelancerProfile.ratingAvg).toFixed(1)}</b>{" "}
              ({gig.freelancerProfile.ratingCount} reviews)
            </span>
          </div>
        </div>

        <div className="aspect-video bg-neutral-100 rounded flex items-center justify-center text-neutral-400 overflow-hidden">
          {gig.coverImageUrl ? (
            <img src={gig.coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : isWorkshop ? (
            "Workshop cover image"
          ) : (
            "Gig cover image / walkthrough video"
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-neutral-900">{isWorkshop ? "About this workshop" : "About this gig"}</h2>
            {gig.level && (
              <span className="badge">{String(gig.level).charAt(0) + String(gig.level).slice(1).toLowerCase()}</span>
            )}
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">{gig.description}</p>
          {gig.portfolioNote && <p className="text-sm text-neutral-500 mt-3 italic">{gig.portfolioNote}</p>}
        </div>

        {gig.faqItems && gig.faqItems.length > 0 && (
          <div className="card p-5">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">FAQ</h2>
            <div className="flex flex-col gap-4">
              {gig.faqItems.map((item: any) => (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-neutral-900">{item.question}</p>
                  <p className="text-sm text-neutral-600 mt-1">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(gig.cancellationWindowHours || gig.latePenaltyPercent) && (
          <div className="card p-4 text-sm text-neutral-600">
            <span className="font-semibold text-neutral-900">Cancellation policy: </span>
            Free cancellation up to {gig.cancellationWindowHours ?? 48}h before{isWorkshop ? " the session" : " delivery"}, {gig.latePenaltyPercent ?? 50}% penalty inside that window.
          </div>
        )}

        {!isWorkshop && gig.packages.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-3">Compare packages</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-neutral-200 rounded overflow-hidden">
                <thead>
                  <tr className="bg-neutral-50 text-left text-neutral-600">
                    <th className="p-3 font-semibold">&nbsp;</th>
                    {gig.packages.map((p: any) => (
                      <th key={p.tier} className="p-3 font-semibold">{p.tier.charAt(0) + p.tier.slice(1).toLowerCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-t [&>tr]:border-neutral-200">
                  <tr><td className="p-3 text-neutral-500">Price</td>{gig.packages.map((p: any) => <td key={p.tier} className="p-3 font-bold">£{Number(p.priceGbp).toFixed(0)}</td>)}</tr>
                  <tr><td className="p-3 text-neutral-500">Delivery time</td>{gig.packages.map((p: any) => <td key={p.tier} className="p-3">{p.deliveryDays} days</td>)}</tr>
                  <tr><td className="p-3 text-neutral-500">Revisions</td>{gig.packages.map((p: any) => <td key={p.tier} className="p-3">{p.revisions}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isWorkshop && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-3">Schedule</h2>
            <div className="card p-5 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Date</span><span className="font-semibold">{gig.sessionStartAt?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Time</span><span className="font-semibold">{gig.sessionStartAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – {gig.sessionEndAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} (UTC)</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Seats</span><span className="font-semibold">{Math.max((gig.maxSeats ?? 0) - (gig.seatsBooked ?? 0), 0)} of {gig.maxSeats} left</span></div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-3">FAQ</h2>
          <div className="flex flex-col divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {sampleFaqs.map((f) => (
              <div key={f.q} className="py-4">
                <p className="text-sm font-semibold text-neutral-900 mb-1">{f.q}</p>
                <p className="text-sm text-neutral-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">
            <span className="stars">★★★★★</span> {Number(gig.freelancerProfile.ratingAvg).toFixed(1)} ({gig.freelancerProfile.ratingCount} reviews)
          </h2>
          <div className="flex flex-col divide-y divide-neutral-200 border-t border-neutral-200 mt-3">
            {sampleReviews.map((r) => (
              <div key={r.author} className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-semibold">
                    {r.author.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">{r.author}</span>
                  <span className="stars text-xs">{"★".repeat(r.rating)}</span>
                </div>
                <p className="text-sm text-neutral-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="sticky top-24 flex flex-col gap-6">
          {isWorkshop ? (
            <WorkshopBooking
              gigPackageId={gig.packages?.[0]?.id ?? gig.workshopPackageId}
              priceGbp={gig.workshopPriceGbp ?? Number(gig.packages?.[0]?.priceGbp ?? 0)}
              seatsLeft={Math.max((gig.maxSeats ?? 0) - (gig.seatsBooked ?? 0), 0)}
              maxSeats={gig.maxSeats ?? 0}
              sellerId={gig.freelancerProfile.user.id}
            />
          ) : (
            <PackageTabs
              packages={gig.packages}
              sellerId={gig.freelancerProfile.user.id}
              freelancerSlug={gig.freelancerProfile.slug}
              isTraining={gig.gigType === "TRAINING"}
              extras={gig.extras.map((e: any) => ({ id: e.id, title: e.title, description: e.description, priceGbp: Number(e.priceGbp), extraDeliveryDays: e.extraDeliveryDays }))}
            />
          )}

          <div className="card p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">About the seller</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-neutral-800 text-white flex items-center justify-center font-semibold">
                {gig.freelancerProfile.user.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">{gig.freelancerProfile.user.fullName}</p>
                <p className="text-xs text-neutral-500 mb-1">
                  <span className="stars">★★★★★</span> {Number(gig.freelancerProfile.ratingAvg).toFixed(1)} ({gig.freelancerProfile.ratingCount})
                </p>
                <OnlineStatusBadge lastActiveAt={gig.freelancerProfile.user.lastActiveAt ?? null} />
              </div>
            </div>
            {/* FIXED (real gap found during review): certifications were
                already fetched into this page — only a vague "✓ Oracle
                Certified" badge was ever shown, never which specific
                credentials a buyer would actually be trusting. */}
            {gig.freelancerProfile.certifications && gig.freelancerProfile.certifications.length > 0 && (
              <div className="mb-3 flex flex-col gap-1.5">
                {gig.freelancerProfile.certifications.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs">
                    <span className={c.verifiedByAdmin ? "text-brand-600" : "text-neutral-400"}>
                      {c.verifiedByAdmin ? "✓" : "○"}
                    </span>
                    <span className="text-neutral-700">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/freelancers/${gig.freelancerProfile.slug}`} className="btn-secondary w-full">
              View full profile
            </Link>
            <Link href={`/messages/${gig.freelancerProfile.user.id}?gigId=${gig.id}`} className="btn-secondary w-full mt-2">
              Contact about this gig
            </Link>
          </div>
        </div>
      </div>
    </div>

    {otherGigs.length > 0 && (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          More from {gig.freelancerProfile.user.fullName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {otherGigs.map((g: any) => (
            <Link key={g.id} href={`/gigs/${g.slug}`} className="card p-4 hover:shadow-md transition-shadow">
              <p className="text-xs text-brand-700 font-semibold mb-1">{g.gigType}</p>
              <p className="text-sm font-semibold text-neutral-900 line-clamp-2 mb-2">{g.title}</p>
              {g.packages[0] && <p className="text-sm font-bold text-neutral-900">From £{Number(g.packages[0].priceGbp).toFixed(0)}</p>}
            </Link>
          ))}
        </div>
      </div>
    )}
    </>
  );
}
