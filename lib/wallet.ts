// FIXED (Milestone 12 gap): no wallet/balance concept existed anywhere.
// Deliberately NOT a denormalized stored balance field — it's always
// computed from the Transaction ledger (Milestone 10/11), so it can never
// drift out of sync with the actual recorded events. The ledger is the
// single source of truth; this is just arithmetic over it.

export type WalletTotals = {
  totalEarnedGbp: number; // sum of all successful payouts, ever
  totalWithdrawnGbp: number; // sum of all completed withdrawals, ever
};

// FIXED (Milestone 12 gap): the DB-querying half of the wallet — sums the
// Transaction ledger rather than trusting any stored balance field, for
// the same never-drifts-out-of-sync reason as everything else in this
// file. Import prisma lazily inline rather than at module scope, so this
// file (like lib/pricing.ts) stays safe to import from anywhere without
// pulling Prisma into contexts that don't need it.
export async function getWalletSummary(freelancerUserId: string): Promise<WalletTotals> {
  const { prisma } = await import("@/lib/prisma");
  const [payoutSum, withdrawalSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: freelancerUserId, type: "PAYOUT", status: "SUCCEEDED" },
      _sum: { amountGbp: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: freelancerUserId, type: "WITHDRAWAL", status: "SUCCEEDED" },
      _sum: { amountGbp: true },
    }),
  ]);
  return {
    totalEarnedGbp: Number(payoutSum._sum.amountGbp ?? 0),
    totalWithdrawnGbp: Number(withdrawalSum._sum.amountGbp ?? 0),
  };
}

/** Funds earned but not yet withdrawn — what's actually available to withdraw now. */
export function calculateAvailableBalance({ totalEarnedGbp, totalWithdrawnGbp }: WalletTotals): number {
  return Math.max(0, Math.round((totalEarnedGbp - totalWithdrawnGbp) * 100) / 100);
}

export class InsufficientBalanceError extends Error {}

/** Validates a withdrawal request amount against the available balance — throws rather than silently clamping, since a withdrawal for more than is available is a real error to surface, not something to quietly correct. */
export function validateWithdrawalAmount(requestedGbp: number, availableGbp: number): void {
  if (requestedGbp <= 0) throw new InsufficientBalanceError("Withdrawal amount must be greater than zero.");
  if (requestedGbp > availableGbp) {
    throw new InsufficientBalanceError(`You can only withdraw up to your available balance of £${availableGbp.toFixed(2)}.`);
  }
}
