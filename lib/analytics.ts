// FIXED (Milestone 15 gap): no chart/analytics/reports capability existed
// anywhere on the platform — every dashboard was numbers-in-cards only.
// These functions produce real, computed time-series and summary data
// from the same Transaction ledger and core tables already built in
// earlier milestones — nothing here is a new source of truth, just a new
// lens on data that already exists.

export type MonthlyDataPoint = { month: string; amountGbp: number };

function lastNMonthLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }));
  }
  return labels;
}

/** Pure aggregation, independent of "now" — buckets a flat list of dated
 * amounts into the given month labels, summing whatever falls outside the
 * known labels into nothing (silently dropped, same as the inline logic
 * this replaces) rather than growing the chart unpredictably. */
export function aggregateAmountsByMonth(entries: { amountGbp: number; createdAt: Date }[], labels: string[]): MonthlyDataPoint[] {
  const totals = new Map<string, number>(labels.map((l) => [l, 0]));
  for (const entry of entries) {
    const label = entry.createdAt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    if (totals.has(label)) totals.set(label, (totals.get(label) ?? 0) + entry.amountGbp);
  }
  return labels.map((month) => ({ month, amountGbp: Math.round((totals.get(month) ?? 0) * 100) / 100 }));
}

/** A freelancer's monthly earnings (successful payouts) for the last N months. */
export async function getFreelancerEarningsByMonth(userId: string, months: number = 6): Promise<MonthlyDataPoint[]> {
  const { prisma } = await import("@/lib/prisma");
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const payouts = await prisma.transaction.findMany({
    where: { userId, type: "PAYOUT", status: "SUCCEEDED", createdAt: { gte: since } },
    select: { amountGbp: true, createdAt: true },
  });

  const labels = lastNMonthLabels(months);
  return aggregateAmountsByMonth(
    payouts.map((p: { amountGbp: any; createdAt: Date }) => ({ amountGbp: Number(p.amountGbp), createdAt: p.createdAt })),
    labels
  );
}

// FIXED (Milestone 17 gap): Orders/Payment/Freelancer-performance/Client-
// activity reports didn't exist — Milestone 15 built dashboard summary
// cards and one chart, not the breakdowns an operational report actually
// needs. All four accept a real date range rather than a hardcoded
// window, closing "Test Report Filters" — defaulting to the last 90 days
// when no range is given, not "all time", since an unbounded report
// query is the one thing "Test Report Performance" would actually catch.

export type DateRange = { from: Date; to: Date };

export function defaultReportRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return { from, to };
}

// FIXED (final check): both the reports page and the export route parsed
// ?from=/?to= independently with no upper bound on the span — an admin
// (or a scripted request) could ask for a 50-year range, and even with
// the groupBy fix above, "how many distinct gigs/transactions ever
// existed" is still a real cost worth capping rather than trusting
// unbounded user input. One shared parser, one shared limit.
const MAX_REPORT_RANGE_DAYS = 730; // 2 years

export function parseReportRange(fromParam: string | null | undefined, toParam: string | null | undefined): DateRange {
  const fallback = defaultReportRange();
  const from = fromParam ? new Date(fromParam) : fallback.from;
  const to = toParam ? new Date(toParam) : fallback.to;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return fallback;

  const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays > MAX_REPORT_RANGE_DAYS) {
    const clampedFrom = new Date(to);
    clampedFrom.setDate(clampedFrom.getDate() - MAX_REPORT_RANGE_DAYS);
    return { from: clampedFrom, to };
  }
  return { from, to };
}

export type OrdersReport = {
  totalOrders: number;
  byStatus: { status: string; count: number }[];
  byCategory: { categoryName: string; count: number }[];
};

export async function getOrdersReport(range: DateRange = defaultReportRange()): Promise<OrdersReport> {
  const { prisma } = await import("@/lib/prisma");
  const where = { createdAt: { gte: range.from, lte: range.to } };

  // FIXED (final check, real performance gap): this previously fetched
  // one full row per ORDER just to tally categories — completely
  // unbounded, and directly the kind of thing "Test Report Performance"
  // should catch: a wide date range could mean fetching millions of rows
  // to compute a handful of counts. Grouping on gigId instead is bounded
  // by the number of DISTINCT GIGS with orders in range, not the number
  // of orders — categories are a small, roughly-fixed set (a dozen or so
  // Oracle modules), so a per-gig group-by followed by a small targeted
  // gig lookup scales with catalogue size, not order volume.
  const [totalOrders, statusGroups, gigGroups] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["gigId"], where, _count: { _all: true } }),
  ]);

  const gigIds = gigGroups.map((g: { gigId: string }) => g.gigId);
  const gigs = await prisma.gig.findMany({ where: { id: { in: gigIds } }, select: { id: true, category: { select: { name: true } } } });
  const gigCategoryMap: Map<string, string> = new Map(
    gigs.map((g: { id: string; category: { name: string } }): [string, string] => [g.id, g.category.name])
  );

  const categoryCounts = new Map<string, number>();
  for (const g of gigGroups as { gigId: string; _count: { _all: number } }[]) {
    const categoryName = gigCategoryMap.get(g.gigId) ?? "Unknown";
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) ?? 0) + g._count._all);
  }

  return {
    totalOrders,
    byStatus: statusGroups.map((g: { status: string; _count: { _all: number } }) => ({ status: g.status, count: g._count._all })),
    byCategory: Array.from(categoryCounts.entries())
      .map(([categoryName, count]) => ({ categoryName, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export type PaymentReport = {
  byType: { type: string; count: number; totalGbp: number }[];
  failedPaymentCount: number;
};

export async function getPaymentReport(range: DateRange = defaultReportRange()): Promise<PaymentReport> {
  const { prisma } = await import("@/lib/prisma");
  const where = { createdAt: { gte: range.from, lte: range.to } };

  const [groups, failedPaymentCount] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where, _count: { _all: true }, _sum: { amountGbp: true } }),
    prisma.transaction.count({ where: { ...where, type: "PAYMENT", status: "FAILED" } }),
  ]);

  return {
    byType: groups.map((g: { type: string; _count: { _all: number }; _sum: { amountGbp: any } }) => ({
      type: g.type,
      count: g._count._all,
      totalGbp: Number(g._sum.amountGbp ?? 0),
    })),
    failedPaymentCount,
  };
}

export type FreelancerPerformanceRow = {
  name: string;
  slug: string;
  completedOrders: number;
  ratingAvg: number;
  ratingCount: number;
  totalEarnedGbp: number;
};

export async function getFreelancerPerformanceReport(range: DateRange = defaultReportRange(), limit: number = 20): Promise<FreelancerPerformanceRow[]> {
  const { prisma } = await import("@/lib/prisma");

  const profiles = await prisma.freelancerProfile.findMany({
    include: {
      user: true,
      gigs: { include: { orders: { where: { status: "COMPLETED", updatedAt: { gte: range.from, lte: range.to } } } } },
    },
  });

  const rows = profiles.map((p: any) => {
    const completedOrders = p.gigs.reduce((sum: number, g: any) => sum + g.orders.length, 0);
    const totalEarnedGbp = p.gigs.reduce(
      (sum: number, g: any) => sum + g.orders.reduce((s: number, o: any) => s + Number(o.totalPriceGbp) * 0.8, 0),
      0
    );
    return {
      name: p.user.fullName,
      slug: p.slug,
      completedOrders,
      ratingAvg: Number(p.ratingAvg),
      ratingCount: p.ratingCount,
      totalEarnedGbp: Math.round(totalEarnedGbp * 100) / 100,
    };
  });

  return rows.filter((r: FreelancerPerformanceRow) => r.completedOrders > 0).sort((a: FreelancerPerformanceRow, b: FreelancerPerformanceRow) => b.completedOrders - a.completedOrders).slice(0, limit);
}

export type ClientActivityRow = {
  name: string;
  email: string;
  ordersPlaced: number;
  totalSpendGbp: number;
};

export async function getClientActivityReport(range: DateRange = defaultReportRange(), limit: number = 20): Promise<ClientActivityRow[]> {
  const { prisma } = await import("@/lib/prisma");

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { ordersAsClient: { where: { createdAt: { gte: range.from, lte: range.to }, status: { not: "CANCELLED" } } } },
  });

  return clients
    .map((c: any) => ({
      name: c.fullName,
      email: c.email,
      ordersPlaced: c.ordersAsClient.length,
      totalSpendGbp: Math.round(c.ordersAsClient.reduce((sum: number, o: any) => sum + Number(o.totalPriceGbp), 0) * 100) / 100,
    }))
    .filter((r: ClientActivityRow) => r.ordersPlaced > 0)
    .sort((a: ClientActivityRow, b: ClientActivityRow) => b.totalSpendGbp - a.totalSpendGbp)
    .slice(0, limit);
}

export type PlatformReport = {
  totalUsers: number;
  totalFreelancers: number;
  totalClients: number;
  totalOrders: number;
  totalRevenueGbp: number; // platform commission earned, not gross payment volume
  openDisputes: number;
  monthlyRevenue: MonthlyDataPoint[];
};

/** FIXED (Milestone 15 gap): "Reports" — total users, revenue, orders — was flagged as a real gap in an earlier review and never built until now. */
export async function getPlatformReport(months: number = 6): Promise<PlatformReport> {
  const { prisma } = await import("@/lib/prisma");
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [totalUsers, totalFreelancers, totalClients, totalOrders, openDisputes, payments] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "FREELANCER" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "DISPUTED" } }),
    prisma.transaction.findMany({
      where: { type: "PAYMENT", status: "SUCCEEDED", createdAt: { gte: since } },
      select: { amountGbp: true, createdAt: true },
    }),
  ]);

  // Platform revenue = the 20% commission, not the full payment volume —
  // the full amount belongs to the freelancer, not the platform.
  const PLATFORM_FEE_RATE = 0.2;
  const labels = lastNMonthLabels(months);
  const commissionEntries: { amountGbp: number; createdAt: Date }[] = payments.map((p: { amountGbp: any; createdAt: Date }) => ({
    amountGbp: Number(p.amountGbp) * PLATFORM_FEE_RATE,
    createdAt: p.createdAt,
  }));
  const totalRevenueGbp = Math.round(commissionEntries.reduce((sum, e) => sum + e.amountGbp, 0) * 100) / 100;
  const monthlyRevenue = aggregateAmountsByMonth(commissionEntries, labels);

  return {
    totalUsers,
    totalFreelancers,
    totalClients,
    totalOrders,
    totalRevenueGbp,
    openDisputes,
    monthlyRevenue,
  };
}
