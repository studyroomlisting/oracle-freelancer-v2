import { describe, it, expect } from "vitest";
import { calculatePlatformFee, calculateNetPayout, calculateTeamEngagementTotal, deriveDailyRateFromTotal, calculateVatAmount, PLATFORM_FEE_RATE, WORKING_DAYS_PER_WEEK, VAT_RATE_PERCENT } from "@/lib/pricing";

describe("calculatePlatformFee", () => {
  it("calculates 20% of the total at the default rate", () => {
    expect(calculatePlatformFee(100)).toBe(20);
    expect(calculatePlatformFee(450)).toBe(90);
  });

  it("rounds to the nearest penny", () => {
    expect(calculatePlatformFee(33.33)).toBe(6.67); // 6.666 -> rounds to 6.67
  });

  it("supports a custom rate", () => {
    expect(calculatePlatformFee(100, 0.1)).toBe(10);
  });

  it("returns 0 for a 0 total", () => {
    expect(calculatePlatformFee(0)).toBe(0);
  });
});

describe("calculateNetPayout", () => {
  it("is the total minus the platform fee", () => {
    expect(calculateNetPayout(100)).toBe(80);
    expect(calculateNetPayout(450)).toBe(360);
  });

  it("fee + net payout always reconstructs the original total", () => {
    const total = 733.5;
    const fee = calculatePlatformFee(total);
    const net = calculateNetPayout(total);
    expect(Math.round((fee + net) * 100) / 100).toBe(total);
  });
});

describe("calculateTeamEngagementTotal", () => {
  it("multiplies day rate by weeks by working days per week", () => {
    expect(calculateTeamEngagementTotal(3000, 12)).toBe(3000 * 12 * 5);
  });

  it("returns 0 for 0 weeks", () => {
    expect(calculateTeamEngagementTotal(3000, 0)).toBe(0);
  });
});

describe("deriveDailyRateFromTotal", () => {
  it("is the exact inverse of calculateTeamEngagementTotal", () => {
    const dailyRate = 3000;
    const weeks = 12;
    const total = calculateTeamEngagementTotal(dailyRate, weeks);
    expect(deriveDailyRateFromTotal(total, weeks)).toBe(dailyRate);
  });

  it("returns the total unchanged when weeks is 0 (avoids divide-by-zero)", () => {
    expect(deriveDailyRateFromTotal(5000, 0)).toBe(5000);
  });

  it("rounds to the nearest penny", () => {
    expect(deriveDailyRateFromTotal(1000, 3)).toBe(66.67); // 1000 / 15 = 66.666...
  });
});

describe("exported constants", () => {
  it("PLATFORM_FEE_RATE is 20%", () => {
    expect(PLATFORM_FEE_RATE).toBe(0.2);
  });

  it("WORKING_DAYS_PER_WEEK is 5", () => {
    expect(WORKING_DAYS_PER_WEEK).toBe(5);
  });
});

describe("calculateVatAmount", () => {
  it("extracts the correct VAT portion from a VAT-inclusive total at the standard rate", () => {
    // £120 inclusive at 20% VAT = £100 net + £20 VAT
    expect(calculateVatAmount(120)).toBe(20);
  });

  it("uses VAT_RATE_PERCENT as the default rate", () => {
    expect(VAT_RATE_PERCENT).toBe(20);
  });

  it("returns 0 for a 0% rate", () => {
    expect(calculateVatAmount(100, 0)).toBe(0);
  });

  it("rounds to the nearest penny", () => {
    expect(calculateVatAmount(99.99)).toBeCloseTo(16.66, 2);
  });

  it("supports a custom rate", () => {
    // £110 inclusive at 10% = £100 net + £10 VAT
    expect(calculateVatAmount(110, 10)).toBe(10);
  });
});
