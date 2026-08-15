import { describe, it, expect } from "vitest";
import { aggregateAmountsByMonth, parseReportRange, defaultReportRange } from "@/lib/analytics";

describe("aggregateAmountsByMonth", () => {
  const labels = ["Jan 26", "Feb 26", "Mar 26"];

  it("returns 0 for every label when there are no entries", () => {
    expect(aggregateAmountsByMonth([], labels)).toEqual([
      { month: "Jan 26", amountGbp: 0 },
      { month: "Feb 26", amountGbp: 0 },
      { month: "Mar 26", amountGbp: 0 },
    ]);
  });

  it("sums multiple entries falling in the same month", () => {
    const entries = [
      { amountGbp: 100, createdAt: new Date("2026-02-05") },
      { amountGbp: 50, createdAt: new Date("2026-02-20") },
    ];
    const result = aggregateAmountsByMonth(entries, labels);
    expect(result.find((r) => r.month === "Feb 26")?.amountGbp).toBe(150);
    expect(result.find((r) => r.month === "Jan 26")?.amountGbp).toBe(0);
  });

  it("silently drops entries outside the given labels rather than growing the chart", () => {
    const entries = [{ amountGbp: 999, createdAt: new Date("2020-01-01") }];
    const result = aggregateAmountsByMonth(entries, labels);
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, r) => sum + r.amountGbp, 0)).toBe(0);
  });

  it("rounds to the nearest penny", () => {
    const entries = [
      { amountGbp: 10.001, createdAt: new Date("2026-01-01") },
      { amountGbp: 10.002, createdAt: new Date("2026-01-01") },
    ];
    const result = aggregateAmountsByMonth(entries, labels);
    expect(result.find((r) => r.month === "Jan 26")?.amountGbp).toBe(20);
  });
});

describe("parseReportRange", () => {
  it("falls back to the default 90-day range when nothing is given", () => {
    const result = parseReportRange(undefined, undefined);
    const fallback = defaultReportRange();
    expect(result.to.toDateString()).toBe(fallback.to.toDateString());
  });

  it("uses the given range when it's valid and within the max span", () => {
    const result = parseReportRange("2026-01-01", "2026-02-01");
    expect(result.from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(result.to.toISOString().slice(0, 10)).toBe("2026-02-01");
  });

  it("falls back to default when from is after to", () => {
    const result = parseReportRange("2026-06-01", "2026-01-01");
    const fallback = defaultReportRange();
    expect(result.to.toDateString()).toBe(fallback.to.toDateString());
  });

  it("clamps a range wider than 2 years down to the max span, keeping the requested end date", () => {
    const result = parseReportRange("2000-01-01", "2026-01-01");
    const spanDays = (result.to.getTime() - result.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(spanDays).toBeCloseTo(730, 0);
    expect(result.to.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("falls back to default when a date string is unparseable", () => {
    const result = parseReportRange("not-a-date", "also-not-a-date");
    const fallback = defaultReportRange();
    expect(result.to.toDateString()).toBe(fallback.to.toDateString());
  });
});
