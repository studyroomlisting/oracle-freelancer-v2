// Centralized constants — import these instead of hardcoding the strings
// elsewhere, so a typo like "Confirmed" vs "confirmed" can't silently break
// filtering/validation. Where a value maps directly to a Prisma enum
// (GigType, TeachingMode, PackageTier, etc.) the enum is the source of
// truth for the database; these arrays exist for UI dropdowns and
// non-schema business logic (e.g. skill category isn't a DB enum since the
// category list is data-driven via the Category table already).

export const SKILL_CATEGORIES = [
  "Oracle ERP Cloud",
  "Oracle HCM Cloud",
  "Oracle SCM",
  "Oracle DBA",
  "Oracle OCI",
  "Oracle Integration Cloud (OIC)",
  "Oracle E-Business Suite",
  "Oracle EPM",
  "Oracle APEX",
] as const;

export const TEACHING_MODES = ["ONLINE", "OFFLINE", "HYBRID"] as const;

export const COURSE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export const PACKAGE_TIERS = ["BASIC", "STANDARD", "PREMIUM"] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

// Platform-default cancellation policy, used whenever a Gig doesn't set its
// own cancellationWindowHours/latePenaltyPercent. Keeping this as a named
// constant (rather than a magic number inline) so Terms of Service copy and
// enforcement logic can both reference the same value.
export const DEFAULT_CANCELLATION_WINDOW_HOURS = 48;
export const DEFAULT_LATE_PENALTY_PERCENT = 50;

// FIXED (test-scenario gap review, Medium-High): browse/trainers/workshops/
// teams/projects previously used a hard `take: N` cap with no way to see
// results beyond it. This is the shared page size for the pagination now
// wired into those listing queries.
export const PAGE_SIZE = 12;

// Free tier: a freelancer can lead this many teams before needing Oracle
// Team Pro. Chosen deliberately low (most freelancers lead 0-1 teams) so the
// upsell is meaningful without blocking normal usage.
export const FREE_TIER_MAX_TEAMS_LED = 1;
export const TEAM_PRO_PRICE_GBP_PER_MONTH = 99;

