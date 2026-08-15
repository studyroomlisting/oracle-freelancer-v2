import { describe, it, expect, vi } from "vitest";

// hasConflict itself is pure and touches no database, but lib/availability.ts
// also exports Prisma-dependent functions, so importing the module pulls in
// lib/prisma.ts at load time. Mock it so this test suite doesn't require a
// generated Prisma client just to exercise pure logic.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { hasConflict } from "@/lib/availability";

const iv = (startHour: number, endHour: number) => ({
  start: new Date(2026, 0, 1, startHour, 0),
  end: new Date(2026, 0, 1, endHour, 0),
});

describe("hasConflict", () => {
  it("detects a simple overlap", () => {
    expect(hasConflict([iv(9, 11)], iv(10, 12))).toBe(true);
  });

  it("does not flag back-to-back slots as conflicting", () => {
    // One ends exactly when the next starts — half-open intervals, no overlap.
    expect(hasConflict([iv(9, 10)], iv(10, 11))).toBe(false);
  });

  it("returns false when there is no overlap at all", () => {
    expect(hasConflict([iv(9, 10)], iv(14, 15))).toBe(false);
  });

  it("detects when the candidate fully contains an existing slot", () => {
    expect(hasConflict([iv(10, 11)], iv(9, 12))).toBe(true);
  });

  it("detects when the candidate is fully contained within an existing slot", () => {
    expect(hasConflict([iv(9, 17)], iv(12, 13))).toBe(true);
  });

  it("returns false for an empty existing-slots list", () => {
    expect(hasConflict([], iv(9, 10))).toBe(false);
  });

  it("checks against multiple existing slots and finds the conflicting one", () => {
    expect(hasConflict([iv(6, 7), iv(9, 10), iv(15, 16)], iv(9, 10))).toBe(true);
    expect(hasConflict([iv(6, 7), iv(11, 12), iv(15, 16)], iv(9, 10))).toBe(false);
  });
});
