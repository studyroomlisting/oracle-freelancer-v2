import { describe, it, expect } from "vitest";
import { calculateAvailableBalance, validateWithdrawalAmount, InsufficientBalanceError } from "@/lib/wallet";

describe("calculateAvailableBalance", () => {
  it("is earned minus withdrawn", () => {
    expect(calculateAvailableBalance({ totalEarnedGbp: 500, totalWithdrawnGbp: 200 })).toBe(300);
  });

  it("is 0 when nothing has been earned yet", () => {
    expect(calculateAvailableBalance({ totalEarnedGbp: 0, totalWithdrawnGbp: 0 })).toBe(0);
  });

  it("never goes negative even if withdrawn somehow exceeds earned", () => {
    expect(calculateAvailableBalance({ totalEarnedGbp: 100, totalWithdrawnGbp: 150 })).toBe(0);
  });

  it("rounds to the nearest penny", () => {
    expect(calculateAvailableBalance({ totalEarnedGbp: 100.005, totalWithdrawnGbp: 0 })).toBeCloseTo(100.01, 2);
  });
});

describe("validateWithdrawalAmount", () => {
  it("allows a request within the available balance", () => {
    expect(() => validateWithdrawalAmount(50, 100)).not.toThrow();
  });

  it("allows withdrawing the full available balance", () => {
    expect(() => validateWithdrawalAmount(100, 100)).not.toThrow();
  });

  it("rejects a request exceeding the available balance", () => {
    expect(() => validateWithdrawalAmount(150, 100)).toThrow(InsufficientBalanceError);
  });

  it("rejects a zero or negative amount", () => {
    expect(() => validateWithdrawalAmount(0, 100)).toThrow(InsufficientBalanceError);
    expect(() => validateWithdrawalAmount(-10, 100)).toThrow(InsufficientBalanceError);
  });
});
