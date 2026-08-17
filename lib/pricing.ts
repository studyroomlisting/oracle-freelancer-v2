// Centralized pricing math. This exists because an audit found the platform
// fee calculation duplicated in 2 API routes and the "day rate × weeks × 5
// working days" total duplicated in 5 places across routes, pages, and
// components — real drift risk for a marketplace handling money (update the
// rate in one place, forget the other, pricing silently diverges). Import
// from here instead of recalculating inline.
//
// No Prisma import here deliberately — this file is safe to import from
// client components (e.g. TeamBuilder.tsx) as well as server routes.

export const PLATFORM_FEE_RATE = 0.2; // 20% commission, matches the revenue-model doc
// ADDED: Fiverr-style buyer/service fee, charged to the CLIENT on top of
// the listed price — separate revenue stream from PLATFORM_FEE_RATE
// above, which comes out of the freelancer's payout instead. The two
// never overlap: the freelancer's payout math (calculateNetPayout below)
// is completely unaffected by this constant.
export const CLIENT_SERVICE_FEE_RATE = 0.055; // 5.5%, matches Fiverr's buyer fee
export const WORKING_DAYS_PER_WEEK = 5;
// FIXED (Milestone 10 gap): no tax/VAT concept existed anywhere. UK
// standard VAT rate. Prices are treated as VAT-inclusive — this extracts
// the VAT portion for invoicing/record-keeping rather than adding it on
// top, so nothing about checkout pricing changes for the client.
export const VAT_RATE_PERCENT = 20;

/** Extracts the VAT portion from a VAT-inclusive total. */
export function calculateVatAmount(totalPriceGbp: number, vatRatePercent: number = VAT_RATE_PERCENT): number {
  return roundToPence(totalPriceGbp - totalPriceGbp / (1 + vatRatePercent / 100));
}

/** Rounds to 2 decimal places — standard for GBP amounts. */
function roundToPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** The platform's cut of a total price, at the standard commission rate. */
export function calculatePlatformFee(totalPriceGbp: number, rate: number = PLATFORM_FEE_RATE): number {
  return roundToPence(totalPriceGbp * rate);
}

/** What the freelancer/team actually receives after the platform fee. */
export function calculateNetPayout(totalPriceGbp: number, rate: number = PLATFORM_FEE_RATE): number {
  return roundToPence(totalPriceGbp - calculatePlatformFee(totalPriceGbp, rate));
}

/** The buyer/service fee charged to the CLIENT, on top of totalPriceGbp. */
export function calculateClientServiceFee(totalPriceGbp: number, rate: number = CLIENT_SERVICE_FEE_RATE): number {
  return roundToPence(totalPriceGbp * rate);
}

/** What the client actually pays: the listed price plus the service fee. */
export function calculateClientPayableTotal(totalPriceGbp: number, rate: number = CLIENT_SERVICE_FEE_RATE): number {
  return roundToPence(totalPriceGbp + calculateClientServiceFee(totalPriceGbp, rate));
}

/** Total estimated cost for a team engagement: day rate × weeks × working days/week. */
export function calculateTeamEngagementTotal(dailyRateGbp: number, estimatedWeeks: number): number {
  return dailyRateGbp * estimatedWeeks * WORKING_DAYS_PER_WEEK;
}

/**
 * Inverse of calculateTeamEngagementTotal — derives an implied day rate from
 * a total price and duration. Used when a team applies to an Open Project
 * posting with a single total price (like an individual freelancer would),
 * but the resulting TeamOrder needs a day rate to stay consistent with how
 * every other team engagement is priced.
 */
export function deriveDailyRateFromTotal(totalPriceGbp: number, estimatedWeeks: number): number {
  if (estimatedWeeks <= 0) return totalPriceGbp;
  return roundToPence(totalPriceGbp / (estimatedWeeks * WORKING_DAYS_PER_WEEK));
}
