import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { sampleGigs, sampleTeams } from "@/lib/sampleData";
import GigCard from "@/components/GigCard";
import TrustScoreCard from "@/components/TrustScoreCard";
import OnlineStatusBadge from "@/components/OnlineStatusBadge";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

function findSampleTrustScore(slug: string) {
  for (const team of sampleTeams) {
    const member = team.members.find((m) => m.slug === slug);
    if (member) {
      return {
        onTimeDeliveryRate: member.onTimeDeliveryRate,
        avgResponseMinutes: member.avgResponseMinutes,
        collaborationRating: member.collaborationRating,
        projectsCompleted: member.projectsCompleted,
      };
    }
  }
  return { onTimeDeliveryRate: 90, avgResponseMinutes: 30, collaborationRating: 9.0, projectsCompleted: 0 };
}

async function getFreelancer(slug: string) {
  if (process.env.DATABASE_URL) {
    try {
      const profile = await prisma.freelancerProfile.findUnique({
        where: { slug },
        include: {
          user: true,
          certifications: true,
          gigs: { where: { status: "ACTIVE" }, include: { category: true, packages: true } },
          reviews: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 10 },
          portfolioItems: { orderBy: { displayOrder: "asc" } },
          education: { orderBy: { displayOrder: "asc" } },
          workExperience: { orderBy: { displayOrder: "asc" } },
        },
      });
      if (profile) return profile;
    } catch {
      // fall through
    }
  }
  const sample = sampleGigs.find((g) => g.freelancerSlug === slug);
  if (!sample) return null;
  return {
    slug: sample.freelancerSlug,
    headline: `${sample.categoryName} specialist`,
    bio: "Sample profile shown because no live database is connected yet. Connect DATABASE_URL and seed real freelancer data to replace this.",
    sellerLevel: sample.sellerLevel,
    isCertified: sample.isCertified,
    ratingAvg: sample.ratingAvg,
    ratingCount: sample.ratingCount,
    oracleModules: sample.categoryName,
    yearsExperience: 8,
    hourlyRateGbp: 65,
    ...findSampleTrustScore(sample.freelancerSlug),
    user: { id: `sample-user-${sample.freelancerSlug}`, fullName: sample.freelancerName },
    certifications: sample.isCertified
      ? [{ id: "1", name: "Oracle Cloud Implementation Specialist", issuer: "Oracle", verifiedByAdmin: true }]
      : [],
    gigs: sampleGigs.filter((g) => g.freelancerSlug === slug),
    reviews: [] as { id: string; rating: number; comment: string; createdAt: Date; author: { fullName: string } }[],
    portfolioItems: [] as { id: string; title: string; description: string; imageUrl: string | null; videoUrl: string | null; projectUrl: string | null }[],
    education: [] as { id: string; institution: string; degree: string; fieldOfStudy: string | null; graduationYear: number | null }[],
    workExperience: [] as { id: string; companyName: string; role: string; startYear: number; endYear: number | null; description: string | null }[],
    isProfilePublic: true,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const freelancer = await getFreelancer(params.slug);
  if (!freelancer) return { title: "Freelancer not found — OracleGigs" };
  const description = `${freelancer.headline} — ${freelancer.oracleModules ?? "Oracle"} specialist on OracleGigs.`;
  return {
    title: `${freelancer.user.fullName} — ${freelancer.headline} — OracleGigs`,
    description,
    openGraph: { title: freelancer.user.fullName, description, type: "profile" },
  };
}

export default async function FreelancerProfilePage({ params }: { params: { slug: string } }) {
  const freelancer = await getFreelancer(params.slug);
  if (!freelancer) notFound();

  // FIXED (Milestone 3 gap): no public/private visibility concept existed
  // at all — a profile was always publicly reachable regardless of owner
  // preference. The owner viewing their own profile can still see it while
  // it's private (to preview it), but anyone else gets a 404 — not a
  // "this profile is private" message, since revealing that a slug exists
  // but is hidden is its own minor information leak.
  const session = await getServerSession();
  const isOwner = session?.sub === (freelancer as any).userId;
  if (!(freelancer as any).isProfilePublic && !isOwner) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row gap-5 pb-6 border-b border-neutral-200">
          <div className="w-20 h-20 rounded-full bg-neutral-800 text-white flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
            {freelancer.user.avatarUrl ? (
              <img src={freelancer.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              freelancer.user.fullName.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900">{freelancer.user.fullName}</h1>
              {freelancer.isCertified && <span className="badge-certified">✓ Oracle Certified</span>}
            </div>
            <div className="mt-1">
              <OnlineStatusBadge lastActiveAt={(freelancer.user as any).lastActiveAt ?? null} />
            </div>
            {"sellerLevel" in freelancer && <p className="text-xs text-neutral-500 mt-0.5">{(freelancer as any).sellerLevel}</p>}
            <p className="text-sm text-neutral-700 mt-2">{freelancer.headline}</p>
            <p className="text-xs text-neutral-500 mt-2">
              <span className="stars">★★★★★</span> {Number(freelancer.ratingAvg).toFixed(1)} ({freelancer.ratingCount} reviews) · {freelancer.oracleModules}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-3">About me</h2>
          <p className="text-sm text-neutral-700 leading-relaxed">{freelancer.bio}</p>
        </div>

        {freelancer.certifications.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-3">Certifications</h2>
            <div className="flex flex-col gap-2">
              {freelancer.certifications.map((c: any) => (
                <div key={c.id ?? c.name} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                    <p className="text-xs text-neutral-500">Issued by {c.issuer}</p>
                  </div>
                  {c.verifiedByAdmin && <span className="badge-certified">✓ Verified</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Gigs by {freelancer.user.fullName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {freelancer.gigs.map((g: any) => (
              <GigCard
                key={g.slug}
                gig={{
                  slug: g.slug,
                  title: g.title,
                  freelancerName: freelancer.user.fullName,
                  freelancerSlug: freelancer.slug,
                  sellerLevel: (freelancer as any).sellerLevel,
                  isCertified: freelancer.isCertified,
                  ratingAvg: Number(freelancer.ratingAvg),
                  ratingCount: freelancer.ratingCount,
                  fromPriceGbp: Number(g.packages?.[0]?.priceGbp ?? g.fromPriceGbp ?? 0),
                  categoryName: g.category?.name ?? g.categoryName,
                  gigType: g.gigType,
                  sessionStartAt: g.sessionStartAt,
                  maxSeats: g.maxSeats,
                  seatsBooked: g.seatsBooked,
                  coverImageUrl: g.coverImageUrl ?? null,
                }}
              />
            ))}
          </div>
        </div>

        {"portfolioItems" in freelancer && (freelancer as any).portfolioItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Portfolio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(freelancer as any).portfolioItems.map((p: any) => (
                <div key={p.id} className="card overflow-hidden">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title} className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-neutral-900 mb-1">{p.title}</p>
                    <p className="text-sm text-neutral-600 mb-2">{p.description}</p>
                    <div className="flex gap-3">
                      {/* FIXED (real gap found during review): portfolio
                          only supported a static image — a link to the
                          video (not an embedded iframe, since the exact
                          embed-URL format varies by platform and a broken
                          embed is worse than a reliable link) is the
                          honest, robust choice. */}
                      {p.videoUrl && (
                        <a href={p.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                          🎬 Watch video →
                        </a>
                      )}
                      {p.projectUrl && (
                        <a href={p.projectUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                          View project →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FIXED (real gap found during review): no Work Experience
            section existed at all — only formal Education. */}
        {"workExperience" in freelancer && (freelancer as any).workExperience.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Work experience</h2>
            <div className="flex flex-col gap-3">
              {(freelancer as any).workExperience.map((w: any) => (
                <div key={w.id} className="card p-4">
                  <p className="text-sm font-semibold text-neutral-900">{w.role} · {w.companyName}</p>
                  <p className="text-xs text-neutral-500 mb-1">{w.startYear} – {w.endYear ?? "Present"}</p>
                  {w.description && <p className="text-sm text-neutral-600">{w.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {"education" in freelancer && (freelancer as any).education.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Education</h2>
            <div className="flex flex-col gap-3">
              {(freelancer as any).education.map((e: any) => (
                <div key={e.id} className="card p-4">
                  <p className="text-sm font-semibold text-neutral-900">{e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""}</p>
                  <p className="text-sm text-neutral-600">{e.institution}{e.graduationYear ? ` · ${e.graduationYear}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Reviews</h2>
          {"reviews" in freelancer && (freelancer as any).reviews.length > 0 ? (
            <div className="flex flex-col gap-4">
              {(freelancer as any).reviews.map((r: any) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-neutral-900">{r.author.fullName}</span>
                    <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-sm text-neutral-700">{r.comment}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {/* FIXED (real gap found during review): sellers had no
                      way to respond to a review at all — this is the
                      public display, the actual place a response matters
                      most, since it's what prospective buyers see. */}
                  {r.sellerResponse && (
                    <div className="mt-3 pl-4 border-l-2 border-neutral-200">
                      <p className="text-xs font-bold text-neutral-900 mb-1">Response from {freelancer.user.fullName}</p>
                      <p className="text-sm text-neutral-700">{r.sellerResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No reviews yet.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <TrustScoreCard
          data={{
            ratingAvg: Number(freelancer.ratingAvg),
            ratingCount: freelancer.ratingCount,
            onTimeDeliveryRate: Number((freelancer as any).onTimeDeliveryRate ?? 0),
            avgResponseMinutes: (freelancer as any).avgResponseMinutes ?? 0,
            collaborationRating: Number((freelancer as any).collaborationRating ?? 0),
            projectsCompleted: (freelancer as any).projectsCompleted ?? 0,
          }}
        />

        <div className="card p-5">
          <h3 className="text-sm font-bold text-neutral-900 mb-4">Seller info</h3>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">From</dt>
              <dd className="text-neutral-900 font-medium">United Kingdom</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Member since</dt>
              <dd className="text-neutral-900 font-medium">2022</dd>
            </div>
            {"yearsExperience" in freelancer && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Experience</dt>
                <dd className="text-neutral-900 font-medium">{(freelancer as any).yearsExperience} years</dd>
              </div>
            )}
            {"hourlyRateGbp" in freelancer && (freelancer as any).hourlyRateGbp && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Hourly rate</dt>
                <dd className="text-neutral-900 font-medium">£{(freelancer as any).hourlyRateGbp}/hr</dd>
              </div>
            )}
          </dl>
          <Link href={`/messages/${(freelancer.user as any).id}`} className="btn-secondary w-full mt-5 text-center block">
            Contact me
          </Link>
        </div>
      </div>
    </div>
  );
}
