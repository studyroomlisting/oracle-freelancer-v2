import { describe, it, expect } from "vitest";
import { recomputeAverageRating, allMilestonesApproved } from "@/lib/reviews";

describe("recomputeAverageRating", () => {
  it("returns the new rating itself as the average for the first review", () => {
    expect(recomputeAverageRating(0, 0, 5)).toEqual({ avg: 5, count: 1 });
  });

  it("averages correctly with existing reviews", () => {
    // 3 existing reviews averaging 4.0, a new 5-star review -> (4*3+5)/4 = 4.25
    expect(recomputeAverageRating(4.0, 3, 5)).toEqual({ avg: 4.25, count: 4 });
  });

  it("rounds to 2 decimal places", () => {
    // (4.9*62 + 3)/63 = 4.8698... -> 4.87
    const result = recomputeAverageRating(4.9, 62, 3);
    expect(result.avg).toBe(4.87);
    expect(result.count).toBe(63);
  });

  it("handles a low rating correctly", () => {
    expect(recomputeAverageRating(5, 1, 1)).toEqual({ avg: 3, count: 2 });
  });
});

describe("allMilestonesApproved", () => {
  it("is true when every milestone is APPROVED", () => {
    expect(allMilestonesApproved(["APPROVED", "APPROVED"])).toBe(true);
  });

  it("is false when any milestone isn't APPROVED", () => {
    expect(allMilestonesApproved(["APPROVED", "SUBMITTED"])).toBe(false);
    expect(allMilestonesApproved(["APPROVED", "PENDING"])).toBe(false);
  });

  it("is false for an empty milestone list (nothing to complete)", () => {
    expect(allMilestonesApproved([])).toBe(false);
  });
});
