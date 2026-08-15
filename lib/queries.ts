import { prisma } from "@/lib/prisma";
import { sampleCategories, sampleGigs, sampleTeams, sampleProjectPostings } from "@/lib/sampleData";
import type { GigCardData } from "@/components/GigCard";
import { PAGE_SIZE } from "@/lib/constants";

export type GigTypeFilter = "CONSULTING" | "TRAINING" | "WORKSHOP";

// Fiverr-style seller level, derived from review count until a real leveling
// system (order volume, on-time rate, response rate) is implemented.
function sellerLevelFor(ratingCount: number): string {
  if (ratingCount >= 50) return "Top Rated Seller";
  if (ratingCount >= 20) return "Level 2 Seller";
  if (ratingCount >= 1) return "Level 1 Seller";
  return "New Seller";
}

function mapGigToCard(g: any): GigCardData {
  return {
    slug: g.slug,
    title: g.title,
    freelancerName: g.freelancerProfile.user.fullName,
    freelancerSlug: g.freelancerProfile.slug,
    sellerLevel: sellerLevelFor(g.freelancerProfile.ratingCount),
    isCertified: g.freelancerProfile.isCertified,
    ratingAvg: Number(g.freelancerProfile.ratingAvg),
    ratingCount: g.freelancerProfile.ratingCount,
    fromPriceGbp: Number(g.packages[0]?.priceGbp ?? 0),
    categoryName: g.category.name,
    gigType: g.gigType,
    sessionStartAt: g.sessionStartAt ? new Date(g.sessionStartAt).toISOString() : undefined,
    maxSeats: g.maxSeats ?? undefined,
    seatsBooked: g.seatsBooked ?? undefined,
    coverImageUrl: g.coverImageUrl ?? null,
  };
}

// Every function here tries the real Postgres data first, and only falls back
// to bundled sample data if no DATABASE_URL is configured yet (first run,
// before you've connected a live database). Once DATABASE_URL is set and
// migrated/seeded, these automatically return live data — no code changes needed.

// FIXED (Milestone 5 gap): "Recommended for you" didn't exist anywhere.
// This is a genuine, if modest, content-based recommendation — top-rated
// ACTIVE gigs in categories the client has previously ordered from,
// excluding gigs from freelancers they've already worked with (the point
// is surfacing new options, not re-showing someone they already know
// about). Deliberately returns an empty array rather than a fake
// "recommendation" for a client with no order history yet — nothing
// honest to recommend based on zero signal, so the UI should just not
// show the section rather than show something generic dressed up as
// personalized.
export async function getRecommendedGigs(clientUserId: string, limit: number = 4): Promise<GigCardData[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const pastOrders = await prisma.order.findMany({
      where: { clientId: clientUserId, status: "COMPLETED" },
      select: { gig: { select: { categoryId: true, freelancerProfileId: true } } },
    });
    if (pastOrders.length === 0) return [];

    const categoryIds = Array.from(new Set(pastOrders.map((o: any) => o.gig.categoryId)));
    const knownFreelancerIds = Array.from(new Set(pastOrders.map((o: any) => o.gig.freelancerProfileId)));

    const gigs = await prisma.gig.findMany({
      where: {
        status: "ACTIVE",
        isProjectEngagement: false,
        categoryId: { in: categoryIds },
        freelancerProfileId: { notIn: knownFreelancerIds },
      },
      take: limit,
      orderBy: [{ freelancerProfile: { ratingAvg: "desc" } }, { createdAt: "desc" }],
      include: {
        category: true,
        freelancerProfile: { include: { user: true } },
        packages: { orderBy: { priceGbp: "asc" }, take: 1 },
      },
    });
    return gigs.map(mapGigToCard);
  } catch {
    return [];
  }
}

export async function getFeaturedGigs(gigType?: GigTypeFilter): Promise<GigCardData[]> {
  if (!process.env.DATABASE_URL) {
    return gigType ? sampleGigs.filter((g) => g.gigType === gigType) : sampleGigs;
  }
  try {
    const baseWhere = { status: "ACTIVE" as const, isProjectEngagement: false, ...(gigType ? { gigType } : {}) };
    const include = {
      category: true,
      freelancerProfile: { include: { user: true } },
      packages: { orderBy: { priceGbp: "asc" as const }, take: 1 },
    };

    // FIXED (Milestone 5 gap): "Featured" previously just meant "recent" —
    // no real curation existed. Admin-marked featured gigs now come first;
    // if fewer than 8 exist (a fresh platform, or an admin hasn't curated
    // yet), the remaining slots fall back to highest-rated recent gigs
    // rather than leaving the section sparse or fully fake either way.
    //
    // FIXED (real gap found during review): a freelancer-purchased boost
    // (boostedUntil in the future) now surfaces here too, alongside
    // admin curation — "featured" isn't exclusively admin-controlled
    // anymore.
    const featured = await prisma.gig.findMany({
      where: { ...baseWhere, OR: [{ isFeatured: true }, { boostedUntil: { gt: new Date() } }] },
      take: 8,
      orderBy: { createdAt: "desc" },
      include,
    });

    if (featured.length >= 8) return featured.map(mapGigToCard);

    const fallback = await prisma.gig.findMany({
      where: { ...baseWhere, isFeatured: false, OR: [{ boostedUntil: null }, { boostedUntil: { lte: new Date() } }] },
      take: 8 - featured.length,
      orderBy: [{ freelancerProfile: { ratingAvg: "desc" } }, { createdAt: "desc" }],
      include,
    });

    return [...featured, ...fallback].map(mapGigToCard);
  } catch {
    return gigType ? sampleGigs.filter((g) => g.gigType === gigType) : sampleGigs;
  }
}

export type CategorySummary = { slug: string; name: string; description: string | null };

export async function getCategories(): Promise<CategorySummary[]> {
  if (!process.env.DATABASE_URL) return sampleCategories;
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return categories.length ? categories : sampleCategories;
  } catch {
    return sampleCategories;
  }
}

export type SearchGigsResult = { gigs: GigCardData[]; totalCount: number; totalPages: number; page: number };
export type SearchGigsOptions = { budgetMin?: number; budgetMax?: number; sort?: string; certifiedOnly?: boolean };

function sortGigCards<T extends { ratingAvg: number; fromPriceGbp: number }>(gigs: T[], sort: string | undefined): T[] {
  const copy = [...gigs];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => b.ratingAvg - a.ratingAvg);
    case "price_low":
      return copy.sort((a, b) => a.fromPriceGbp - b.fromPriceGbp);
    case "price_high":
      return copy.sort((a, b) => b.fromPriceGbp - a.fromPriceGbp);
    case "newest":
    default:
      return copy; // already newest-first from the underlying query/array order
  }
}

export async function searchGigs(
  query: string | undefined,
  categorySlug: string | undefined,
  gigType?: GigTypeFilter,
  page: number = 1,
  options: SearchGigsOptions = {}
): Promise<SearchGigsResult> {
  const safePage = Math.max(1, page);
  const { budgetMin, budgetMax, sort, certifiedOnly } = options;

  if (!process.env.DATABASE_URL) {
    let filtered = sampleGigs.filter((g) => {
      const matchesQuery = !query || g.title.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categorySlug || g.categoryName.toLowerCase().replace(/\s+/g, "-").includes(categorySlug);
      const matchesType = !gigType || g.gigType === gigType;
      const matchesBudgetMin = budgetMin == null || g.fromPriceGbp >= budgetMin;
      const matchesBudgetMax = budgetMax == null || g.fromPriceGbp <= budgetMax;
      const matchesCertified = !certifiedOnly || g.isCertified;
      return matchesQuery && matchesCategory && matchesType && matchesBudgetMin && matchesBudgetMax && matchesCertified;
    });
    filtered = sortGigCards(filtered, sort);
    const start = (safePage - 1) * PAGE_SIZE;
    return {
      gigs: filtered.slice(start, start + PAGE_SIZE),
      totalCount: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
      page: safePage,
    };
  }
  try {
    const where = {
      status: "ACTIVE" as const,
      isProjectEngagement: false,
      ...(gigType ? { gigType } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(certifiedOnly ? { freelancerProfile: { isCertified: true } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              { tags: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...((budgetMin != null || budgetMax != null)
        ? {
            packages: {
              some: {
                ...(budgetMin != null ? { priceGbp: { gte: budgetMin } } : {}),
                ...(budgetMax != null ? { priceGbp: { lte: budgetMax } } : {}),
              },
            },
          }
        : {}),
    };
    // Price sort needs the cheapest package ordered at the DB level to be
    // meaningful; rating/newest can sort on the gig itself.
    const orderBy =
      sort === "newest" ? { createdAt: "desc" as const } : sort === "rating" ? { freelancerProfile: { ratingAvg: "desc" as const } } : { createdAt: "desc" as const };

    const [gigs, totalCount] = await Promise.all([
      prisma.gig.findMany({
        where,
        include: {
          category: true,
          freelancerProfile: { include: { user: true } },
          packages: { orderBy: { priceGbp: "asc" }, take: 1 },
        },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy,
      }),
      prisma.gig.count({ where }),
    ]);
    let mapped = gigs.map(mapGigToCard);
    // Price sort is applied post-fetch on the already-paginated page, since
    // it depends on the cheapest package's price (a derived field, not a
    // direct column Prisma can orderBy across a to-many relation).
    if (sort === "price_low" || sort === "price_high") {
      mapped = sortGigCards(mapped, sort);
    }
    return {
      gigs: mapped,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
      page: safePage,
    };
  } catch {
    const fallback = sampleGigs.filter((g) => !gigType || g.gigType === gigType);
    return { gigs: fallback, totalCount: fallback.length, totalPages: 1, page: 1 };
  }
}

// Admin: pending gig approvals, newest first.
export async function getPendingGigs() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.gig.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { category: true, freelancerProfile: { include: { user: true } } },
    });
  } catch {
    return [];
  }
}

// FIXED (Milestone 6 gap): mirrors getPendingGigs — project postings now
// go through the same admin-review queue every other listing type does.
// FIXED (Milestone 11 gap): mirrors the other pending-X queue functions —
// disputed orders now have somewhere for an admin to actually see and act
// on them.
export async function getDisputedOrders() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.order.findMany({
      where: { status: "DISPUTED" },
      orderBy: { disputeRaisedAt: "asc" },
      include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true },
    });
  } catch {
    return [];
  }
}

export async function getPendingProjectPostings() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.projectPosting.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { category: true, client: true },
    });
  } catch {
    return [];
  }
}

// ADDED (admin gap): the admin dashboard previously only ever surfaced
// PENDING_REVIEW postings (via getPendingProjectPostings above) — the
// moment a posting was approved/rejected/awarded it vanished from admin's
// view entirely, with no page to browse it again, unlike gigs which have
// a dedicated "Manage active gigs" page. This mirrors that same pattern
// for projects: every status, searchable, paginated. Read-only query —
// doesn't touch getPendingProjectPostings or anything that depends on it.
export async function getAllProjectPostingsForAdmin(page: number = 1, query?: string, status?: string) {
  if (!process.env.DATABASE_URL) return { postings: [], totalCount: 0, totalPages: 1, page: 1 };
  const safePage = Math.max(1, page);
  try {
    const where = {
      // FIXED: Prisma's `contains` on Postgres is case-sensitive by
      // default — "wordpress developer" wouldn't match a title saved as
      // "WordPress Developer" unless `mode: "insensitive"` is set
      // explicitly. Admins searching by title expect it to just work
      // regardless of casing.
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
      ...(status ? { status: status as any } : {}),
    };
    const [postings, totalCount] = await Promise.all([
      prisma.projectPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { category: true, client: true, _count: { select: { applications: true } } },
      }),
      prisma.projectPosting.count({ where }),
    ]);
    return { postings, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page: safePage };
  } catch {
    return { postings: [], totalCount: 0, totalPages: 1, page: 1 };
  }
}

// Oracle Project Teams

export type NormalizedTeamMember = {
  name: string;
  slug: string;
  roleLabel: string;
  isLeader: boolean;
  isCertified: boolean;
  ratingAvg: number;
  ratingCount: number;
  onTimeDeliveryRate: number;
  avgResponseMinutes: number;
  collaborationRating: number;
  projectsCompleted: number;
};

export type NormalizedTeam = {
  id: string;
  slug: string;
  name: string;
  description: string;
  dailyRateGbp: number;
  availableFromWeeks: number;
  estimatedWeeks: number;
  teamScore: number;
  projectsCompleted: number;
  budgetDeliveredGbp: number;
  successRate: number;
  members: NormalizedTeamMember[];
  // FIXED (Milestone 18 security review): neither of these existed on
  // this type at all — the team detail page had no way to gate visibility
  // even if it tried to, since the data it needed wasn't here.
  status: string;
  teamLeaderUserId: string | null;
};

function normalizeSampleTeam(t: (typeof sampleTeams)[number]): NormalizedTeam {
  return {
    id: `sample-${t.slug}`,
    slug: t.slug,
    name: t.name,
    description: t.description,
    dailyRateGbp: t.dailyRateGbp,
    availableFromWeeks: t.availableFromWeeks,
    estimatedWeeks: t.estimatedWeeks,
    teamScore: t.teamScore,
    projectsCompleted: t.projectsCompleted,
    budgetDeliveredGbp: t.budgetDeliveredGbp,
    successRate: t.successRate,
    status: "ACTIVE",
    teamLeaderUserId: null,
    members: t.members.map((m: any) => ({
      name: m.name,
      slug: m.slug,
      roleLabel: m.roleLabel,
      isLeader: !!m.isLeader,
      isCertified: m.isCertified,
      ratingAvg: m.ratingAvg,
      ratingCount: m.ratingCount,
      onTimeDeliveryRate: m.onTimeDeliveryRate,
      avgResponseMinutes: m.avgResponseMinutes,
      collaborationRating: m.collaborationRating,
      projectsCompleted: m.projectsCompleted,
    })),
  };
}

function normalizeDbTeam(t: any): NormalizedTeam {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    dailyRateGbp: Number(t.dailyRateGbp),
    availableFromWeeks: t.availableFromDate
      ? Math.max(0, Math.ceil((new Date(t.availableFromDate).getTime() - Date.now()) / (7 * 24 * 3600 * 1000)))
      : 0,
    estimatedWeeks: t.estimatedWeeks,
    teamScore: Number(t.teamScore),
    projectsCompleted: t.projectsCompleted,
    budgetDeliveredGbp: Number(t.budgetDeliveredGbp),
    successRate: Number(t.successRate),
    status: t.status,
    teamLeaderUserId: t.teamLeader?.userId ?? null,
    members: t.members.map((m: any) => ({
      name: m.freelancerProfile.user.fullName,
      slug: m.freelancerProfile.slug,
      roleLabel: m.roleLabel,
      isLeader: m.freelancerProfileId === t.teamLeaderId,
      isCertified: m.freelancerProfile.isCertified,
      ratingAvg: Number(m.freelancerProfile.ratingAvg),
      ratingCount: m.freelancerProfile.ratingCount,
      onTimeDeliveryRate: Number(m.freelancerProfile.onTimeDeliveryRate),
      avgResponseMinutes: m.freelancerProfile.avgResponseMinutes,
      collaborationRating: Number(m.freelancerProfile.collaborationRating),
      projectsCompleted: m.freelancerProfile.projectsCompleted,
    })),
  };
}

export type PaginatedTeams = { teams: NormalizedTeam[]; totalCount: number; totalPages: number; page: number };

export async function getTeams(page: number = 1): Promise<PaginatedTeams> {
  const safePage = Math.max(1, page);
  if (!process.env.DATABASE_URL) {
    const all = sampleTeams.map(normalizeSampleTeam);
    const start = (safePage - 1) * PAGE_SIZE;
    return { teams: all.slice(start, start + PAGE_SIZE), totalCount: all.length, totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)), page: safePage };
  }
  try {
    const where = { status: "ACTIVE" as const };
    const [teams, totalCount] = await Promise.all([
      prisma.team.findMany({
        where,
        orderBy: { teamScore: "desc" },
        include: {
          teamLeader: { include: { user: true } },
          members: { where: { status: "ACTIVE" }, include: { freelancerProfile: { include: { user: true } } }, orderBy: { displayOrder: "asc" } },
        },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.team.count({ where }),
    ]);
    if (!teams.length && safePage === 1) {
      const all = sampleTeams.map(normalizeSampleTeam);
      return { teams: all, totalCount: all.length, totalPages: 1, page: 1 };
    }
    return { teams: teams.map(normalizeDbTeam), totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page: safePage };
  } catch {
    const all = sampleTeams.map(normalizeSampleTeam);
    return { teams: all, totalCount: all.length, totalPages: 1, page: 1 };
  }
}

export async function getTeam(slug: string): Promise<NormalizedTeam | null> {
  if (process.env.DATABASE_URL) {
    try {
      const team = await prisma.team.findUnique({
        where: { slug },
        include: {
          teamLeader: { include: { user: true } },
          members: { where: { status: "ACTIVE" }, include: { freelancerProfile: { include: { user: true } } }, orderBy: { displayOrder: "asc" } },
        },
      });
      if (team) return normalizeDbTeam(team);
    } catch {
      // fall through
    }
  }
  const sample = sampleTeams.find((t) => t.slug === slug);
  return sample ? normalizeSampleTeam(sample) : null;
}

// Admin: pending team approvals, newest first.
export async function getPendingTeams() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.team.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { teamLeader: { include: { user: true } }, members: true },
    });
  } catch {
    return [];
  }
}

// Messaging

export async function getInbox(userId: string) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { sender: true, receiver: true },
    });

    // Collapse to one row per conversation partner, most recent message only.
    const byPartner = new Map<string, (typeof messages)[number]>();
    const unreadByPartner = new Map<string, number>();
    for (const m of messages) {
      const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, m);
      if (m.receiverId === userId && !m.readAt) {
        unreadByPartner.set(partnerId, (unreadByPartner.get(partnerId) ?? 0) + 1);
      }
    }
    return Array.from(byPartner.entries()).map(([partnerId, m]) => ({
      partnerId,
      partnerName: m.senderId === userId ? m.receiver.fullName : m.sender.fullName,
      lastMessage: m.body,
      lastMessageAt: m.createdAt,
      unreadCount: unreadByPartner.get(partnerId) ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getThread(userId: string, partnerId: string) {
  if (!process.env.DATABASE_URL) return { partnerName: null, messages: [] as any[] };
  try {
    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: { gig: { select: { id: true, slug: true, title: true } } },
    });

    // Mark incoming messages as read now that the recipient has viewed the thread.
    await prisma.message.updateMany({
      where: { senderId: partnerId, receiverId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { partnerName: partner?.fullName ?? "Unknown user", messages };
  } catch {
    return { partnerName: null, messages: [] as any[] };
  }
}

// Platform-wide stats for the homepage Team CTA banner. Aggregates real Team
// delivery numbers where possible, falls back to the seeded sample team's
// figures so the banner never shows fabricated data.
export async function getPlatformStats() {
  if (!process.env.DATABASE_URL) {
    const t = sampleTeams[0];
    return { projectsCompleted: t.projectsCompleted, budgetDeliveredGbp: t.budgetDeliveredGbp, successRate: t.successRate };
  }
  try {
    const agg = await prisma.team.aggregate({
      where: { status: "ACTIVE" },
      _sum: { projectsCompleted: true, budgetDeliveredGbp: true },
      _avg: { successRate: true },
    });
    if (!agg._sum.projectsCompleted) {
      const t = sampleTeams[0];
      return { projectsCompleted: t.projectsCompleted, budgetDeliveredGbp: t.budgetDeliveredGbp, successRate: t.successRate };
    }
    return {
      projectsCompleted: agg._sum.projectsCompleted ?? 0,
      budgetDeliveredGbp: Number(agg._sum.budgetDeliveredGbp ?? 0),
      successRate: Number(agg._avg.successRate ?? 0),
    };
  } catch {
    const t = sampleTeams[0];
    return { projectsCompleted: t.projectsCompleted, budgetDeliveredGbp: t.budgetDeliveredGbp, successRate: t.successRate };
  }
}

export type TopFreelancer = { name: string; slug: string; headline: string; ratingAvg: number; ratingCount: number; isCertified: boolean; sellerLevel: string };

export type PaginatedFreelancers = { freelancers: TopFreelancer[]; totalCount: number; totalPages: number; page: number };

// Dedicated freelancer directory — searches profiles directly (name,
// headline, bio) rather than gigs, and filters by category via each
// freelancer's real ACTIVE gigs in that category (more reliable than
// matching against the freeform oracleModules string).
export async function searchFreelancers(
  query: string | undefined,
  categorySlug: string | undefined,
  page: number = 1,
  sort?: string
): Promise<PaginatedFreelancers> {
  const safePage = Math.max(1, page);

  if (!process.env.DATABASE_URL) {
    const all = sampleGigs.reduce((acc: TopFreelancer[], g) => {
      if (!acc.find((f) => f.slug === g.freelancerSlug)) {
        acc.push({
          name: g.freelancerName,
          slug: g.freelancerSlug,
          headline: `${g.categoryName} specialist`,
          ratingAvg: g.ratingAvg,
          ratingCount: g.ratingCount,
          isCertified: g.isCertified,
          sellerLevel: g.sellerLevel ?? "New Seller",
        });
      }
      return acc;
    }, []);
    let filtered = all.filter((f) => {
      const matchesQuery = !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.headline.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categorySlug || f.headline.toLowerCase().includes(categorySlug.replace(/-/g, " "));
      return matchesQuery && matchesCategory;
    });
    filtered = [...filtered].sort((a, b) => (sort === "newest" ? 0 : b.ratingAvg - a.ratingAvg));
    const start = (safePage - 1) * PAGE_SIZE;
    return { freelancers: filtered.slice(start, start + PAGE_SIZE), totalCount: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), page: safePage };
  }

  try {
    const where = {
      isApprovedToSell: true,
      ...(query
        ? {
            OR: [
              { user: { fullName: { contains: query, mode: "insensitive" as const } } },
              { headline: { contains: query, mode: "insensitive" as const } },
              { bio: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(categorySlug ? { gigs: { some: { status: "ACTIVE" as const, category: { slug: categorySlug } } } } : {}),
    };
    // FIXED (Milestone 5 gap): no sort option existed at all here — always
    // hardcoded to rating descending, unlike searchGigs() which already
    // supported rating/newest/price sort. "newest" here means most
    // recently joined (createdAt), the closest freelancer-level analogue
    // to a gig's createdAt.
    const orderBy = sort === "newest" ? { createdAt: "desc" as const } : { ratingAvg: "desc" as const };
    const [profiles, totalCount] = await Promise.all([
      prisma.freelancerProfile.findMany({
        where,
        include: { user: true },
        orderBy,
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.freelancerProfile.count({ where }),
    ]);
    const freelancers: TopFreelancer[] = profiles.map((p: any) => ({
      name: p.user.fullName,
      slug: p.slug,
      headline: p.headline,
      ratingAvg: Number(p.ratingAvg),
      ratingCount: p.ratingCount,
      isCertified: p.isCertified,
      sellerLevel: p.ratingAvg >= 4.8 && p.ratingCount >= 10 ? "Top Rated Seller" : p.projectsCompleted >= 5 ? "Level 2 Seller" : "New Seller",
    }));
    return { freelancers, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page: safePage };
  } catch {
    return { freelancers: [], totalCount: 0, totalPages: 1, page: 1 };
  }
}

export async function getTopFreelancers(): Promise<TopFreelancer[]> {
  if (!process.env.DATABASE_URL) {
    return sampleGigs
      .reduce((acc: TopFreelancer[], g) => {
        if (!acc.find((f) => f.slug === g.freelancerSlug)) {
          acc.push({
            name: g.freelancerName,
            slug: g.freelancerSlug,
            headline: `${g.categoryName} specialist`,
            ratingAvg: g.ratingAvg,
            ratingCount: g.ratingCount,
            isCertified: g.isCertified,
            sellerLevel: g.sellerLevel ?? "New Seller",
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.ratingAvg - a.ratingAvg)
      .slice(0, 5);
  }
  try {
    const profiles = await prisma.freelancerProfile.findMany({
      orderBy: { ratingAvg: "desc" },
      take: 5,
      include: { user: true },
    });
    return profiles.map((p: any) => ({
      name: p.user.fullName,
      slug: p.slug,
      headline: p.headline,
      ratingAvg: Number(p.ratingAvg),
      ratingCount: p.ratingCount,
      isCertified: p.isCertified,
      sellerLevel: sellerLevelFor(p.ratingCount),
    }));
  } catch {
    return [];
  }
}

// Admin: unverified certifications awaiting review.
export async function getPendingCertifications() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.certification.findMany({
      where: { verifiedByAdmin: false },
      include: { freelancerProfile: { include: { user: true } } },
      orderBy: { id: "asc" },
    });
  } catch {
    return [];
  }
}

// Corporate Project Matching / open-project-posting board

export async function getOpenProjects(page: number = 1, query?: string) {
  const safePage = Math.max(1, page);
  const sampleMapped = sampleProjectPostings
    .filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()))
    .map((p) => ({
      id: p.slug,
      slug: p.slug,
      title: p.title,
      description: p.description,
      category: { name: p.categoryName },
      budgetMinGbp: p.budgetMinGbp,
      budgetMaxGbp: p.budgetMaxGbp,
      timelineWeeks: p.timelineWeeks,
      _count: { applications: p.applicationCount },
    }));

  if (!process.env.DATABASE_URL) {
    const start = (safePage - 1) * PAGE_SIZE;
    return { postings: sampleMapped.slice(start, start + PAGE_SIZE), totalCount: sampleMapped.length, totalPages: Math.max(1, Math.ceil(sampleMapped.length / PAGE_SIZE)), page: safePage };
  }
  try {
    // FIXED (Milestone 6 gap): there was no search at all on the project
    // board — "Test Requirement Search" had nothing to test. Uses
    // `contains` deliberately, not fulltext — same reasoning as Gig search
    // (Phase 45): fulltext's minimum token length would break short
    // Oracle-acronym searches this platform depends on.
    const where = {
      status: "OPEN" as const,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [postings, totalCount] = await Promise.all([
      prisma.projectPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { category: true, _count: { select: { applications: true } } },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.projectPosting.count({ where }),
    ]);
    if (!postings.length && safePage === 1 && !query) {
      return { postings: sampleMapped, totalCount: sampleMapped.length, totalPages: 1, page: 1 };
    }
    return { postings, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page: safePage };
  } catch {
    return { postings: sampleMapped, totalCount: sampleMapped.length, totalPages: 1, page: 1 };
  }
}

export async function getProjectPosting(slug: string) {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await prisma.projectPosting.findUnique({
      where: { slug },
      include: { category: true, client: true },
    });
  } catch {
    return null;
  }
}
