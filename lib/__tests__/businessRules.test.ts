import { describe, it, expect } from "vitest";
import {
  canLeadAnotherTeam,
  seatsRemaining,
  canBookSeats,
  isAccountLocked,
  lockoutMinutesRemaining,
  shouldLockAccount,
  MAX_FAILED_LOGIN_ATTEMPTS,
  isOnlineNow,
  formatLastSeen,
  ONLINE_THRESHOLD_MINUTES,
} from "@/lib/businessRules";

describe("canLeadAnotherTeam", () => {
  it("allows a free-tier user under the limit", () => {
    expect(canLeadAnotherTeam(false, 0, 1)).toBe(true);
  });

  it("blocks a free-tier user at the limit", () => {
    expect(canLeadAnotherTeam(false, 1, 1)).toBe(false);
  });

  it("blocks a free-tier user over the limit", () => {
    expect(canLeadAnotherTeam(false, 2, 1)).toBe(false);
  });

  it("always allows a subscribed user, regardless of count", () => {
    expect(canLeadAnotherTeam(true, 0, 1)).toBe(true);
    expect(canLeadAnotherTeam(true, 50, 1)).toBe(true);
  });
});

describe("seatsRemaining", () => {
  it("subtracts booked from max", () => {
    expect(seatsRemaining(20, 13)).toBe(7);
  });

  it("never returns negative, even if overbooked somehow", () => {
    expect(seatsRemaining(10, 15)).toBe(0);
  });

  it("returns the full amount when nothing is booked", () => {
    expect(seatsRemaining(20, 0)).toBe(20);
  });
});

describe("canBookSeats", () => {
  it("allows booking within remaining capacity", () => {
    expect(canBookSeats(20, 13, 5)).toBe(true);
  });

  it("allows booking exactly the remaining capacity", () => {
    expect(canBookSeats(20, 13, 7)).toBe(true);
  });

  it("blocks booking more than remaining capacity", () => {
    expect(canBookSeats(20, 13, 8)).toBe(false);
  });

  it("blocks booking when sold out", () => {
    expect(canBookSeats(20, 20, 1)).toBe(false);
  });

  it("rejects a request for 0 or negative seats", () => {
    expect(canBookSeats(20, 0, 0)).toBe(false);
    expect(canBookSeats(20, 0, -1)).toBe(false);
  });
});

describe("account lockout", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("isAccountLocked is false when lockedUntil is null", () => {
    expect(isAccountLocked(null, now)).toBe(false);
  });

  it("isAccountLocked is true when lockedUntil is in the future", () => {
    expect(isAccountLocked(new Date("2026-01-01T12:10:00Z"), now)).toBe(true);
  });

  it("isAccountLocked is false once lockedUntil has passed", () => {
    expect(isAccountLocked(new Date("2026-01-01T11:59:00Z"), now)).toBe(false);
  });

  it("lockoutMinutesRemaining rounds up and returns 0 when not locked", () => {
    expect(lockoutMinutesRemaining(new Date("2026-01-01T12:10:30Z"), now)).toBe(11);
    expect(lockoutMinutesRemaining(null, now)).toBe(0);
  });

  it("shouldLockAccount triggers exactly at the threshold, not before", () => {
    expect(shouldLockAccount(MAX_FAILED_LOGIN_ATTEMPTS - 1)).toBe(false);
    expect(shouldLockAccount(MAX_FAILED_LOGIN_ATTEMPTS)).toBe(true);
    expect(shouldLockAccount(MAX_FAILED_LOGIN_ATTEMPTS + 1)).toBe(true);
  });
});

describe("online status", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("isOnlineNow is false when there's no timestamp at all", () => {
    expect(isOnlineNow(null, now)).toBe(false);
  });

  it("isOnlineNow is true within the threshold", () => {
    expect(isOnlineNow(new Date("2026-01-01T11:57:00Z"), now)).toBe(true);
  });

  it("isOnlineNow is false just past the threshold", () => {
    expect(isOnlineNow(new Date("2026-01-01T11:54:00Z"), now)).toBe(false);
  });

  it("isOnlineNow respects the exact threshold boundary", () => {
    const exactlyAtThreshold = new Date(now.getTime() - ONLINE_THRESHOLD_MINUTES * 60_000);
    expect(isOnlineNow(exactlyAtThreshold, now)).toBe(true);
  });

  it("formatLastSeen returns null with no timestamp", () => {
    expect(formatLastSeen(null, now)).toBe(null);
  });

  it("formatLastSeen renders minutes, hours, and days appropriately", () => {
    expect(formatLastSeen(new Date("2026-01-01T11:58:00Z"), now)).toBe("2 minutes ago");
    expect(formatLastSeen(new Date("2026-01-01T09:00:00Z"), now)).toBe("3 hours ago");
    expect(formatLastSeen(new Date("2025-12-30T12:00:00Z"), now)).toBe("2 days ago");
  });

  it("formatLastSeen says 'just now' for sub-minute gaps", () => {
    expect(formatLastSeen(new Date("2026-01-01T11:59:30Z"), now)).toBe("just now");
  });
});
