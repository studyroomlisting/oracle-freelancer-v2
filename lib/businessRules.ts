// Pure gating/eligibility rules, extracted from their API routes so the
// rule itself is unit-testable without mocking Prisma end-to-end. Each
// function here has a corresponding inline check in the route that used to
// contain this logic — see the comment at each call site.

/**
 * Whether a freelancer can lead one more team, given their subscription
 * status and how many teams they already lead. Used in /api/teams/route.ts.
 */
export function canLeadAnotherTeam(hasActiveSubscription: boolean, activeTeamsLedCount: number, freeTierMax: number): boolean {
  return hasActiveSubscription || activeTeamsLedCount < freeTierMax;
}

/** How many workshop seats are still available, never negative. */
export function seatsRemaining(maxSeats: number, seatsBooked: number): number {
  return Math.max(maxSeats - seatsBooked, 0);
}

/**
 * Whether a requested number of workshop seats can be booked right now.
 * Used in /api/orders/route.ts.
 */
export function canBookSeats(maxSeats: number, seatsBooked: number, requestedSeats: number): boolean {
  return requestedSeats > 0 && requestedSeats <= seatsRemaining(maxSeats, seatsBooked);
}

// Account lockout — per-account defense layered on top of the existing
// IP-based rate limiting on the login route (which alone doesn't stop a
// distributed attack targeting one specific account from many IPs).
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

/** Whether an account is currently locked out, given its lockedUntil timestamp. */
export function isAccountLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** How many minutes remain on an active lockout, rounded up; 0 if not locked. */
export function lockoutMinutesRemaining(lockedUntil: Date | null, now: Date = new Date()): number {
  if (!isAccountLocked(lockedUntil, now)) return 0;
  return Math.ceil((lockedUntil!.getTime() - now.getTime()) / 60_000);
}

/** Given the failed-attempt count *after* this failure, should the account now be locked? */
export function shouldLockAccount(failedAttemptsAfterThisOne: number): boolean {
  return failedAttemptsAfterThisOne >= MAX_FAILED_LOGIN_ATTEMPTS;
}

// Online status — deliberately an honest "recently active" signal derived
// from lastActiveAt, not true presence (no heartbeat/websocket connection
// to know the instant someone closes a tab). Same framing as the
// polling-based chat: close enough to be useful, not overclaiming.
export const ONLINE_THRESHOLD_MINUTES = 5;

export function isOnlineNow(lastActiveAt: Date | null, now: Date = new Date()): boolean {
  if (!lastActiveAt) return false;
  return now.getTime() - lastActiveAt.getTime() <= ONLINE_THRESHOLD_MINUTES * 60_000;
}

/** Human-readable "last seen" string for a non-online user; null if there's no timestamp at all. */
export function formatLastSeen(lastActiveAt: Date | null, now: Date = new Date()): string | null {
  if (!lastActiveAt) return null;
  const minutes = Math.floor((now.getTime() - lastActiveAt.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
