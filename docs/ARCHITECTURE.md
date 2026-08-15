# OracleGigs — Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | PostgreSQL via Supabase, via Prisma ORM 5.20 |
| Auth | Supabase Auth (migrated from custom JWT + bcrypt — see README Phase 69) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| PDF generation | pdf-lib (Contracts, Invoices, SOW/NDA documents) |
| File storage | AWS S3 SDK (real code, needs bucket credentials) with a local-disk fallback for development |
| Testing | Vitest, 139 tests covering pure business logic |

## High-level request flow

```
Browser
  │
  ▼
middleware.ts ── fast-path check: does a session cookie exist at all?
  │                (Edge Runtime — cannot verify the JWT itself here,
  │                 see "Known constraints" below)
  ▼
Next.js App Router (Server Components + Route Handlers)
  │
  ├─ Server Component pages ── call getServerSession() themselves for the
  │                             REAL, authoritative auth check (role,
  │                             ownership, resource-specific rules)
  │
  ├─ API Route Handlers (app/api/**/route.ts)
  │     │
  │     ├─ requireAnySession() / requireFreelancerSession() /
  │     │  requireAdminSession()  ── the actual authorization boundary
  │     │
  │     ├─ zod schema validation on every input
  │     │
  │     └─ withErrorHandling() wrapper ── consistent error shape + logging
  │            on all ~95 routes
  │
  ▼
Prisma Client ── PostgreSQL / Supabase (27 models, 17 enums)
```

## Middleware now does real session verification, not just a fast-path check

This used to be a documented limitation: `jsonwebtoken` (real JWT verification) depends on Node's `crypto` module, unavailable in the Edge Runtime middleware runs on — so middleware could only ever confirm a session cookie was *present*, deferring the actual, authoritative check to each page's `getServerSession()` call in the Node runtime.

The Supabase Auth migration (README Phase 69) removes that limitation entirely. Supabase's `@supabase/ssr` client validates a session via an HTTP call to Supabase's own Auth server, not local JWT crypto — which works correctly in the Edge Runtime. `middleware.ts` now does the full, authoritative check on every protected request, not just a cookie-presence fast-path. Each page's own `getServerSession()` call remains in place too — both as defense-in-depth, and because middleware alone can only answer "is there a valid session," not "does this specific role/ownership check pass," which still needs each page or route's own logic.

**A real bug this migration caught and fixed in the same pass it was introduced**: the old middleware checked for one hardcoded cookie name (`og_session`) that only existed under the custom JWT system. Supabase manages its own, differently-named session cookies — left unfixed, every single logged-in user would have been redirected to login on every protected page, permanently, the moment this migration shipped.

**This two-layer design was the direct cause of a real, found-and-fixed vulnerability** (Phase 60): a page that forgot to call `getServerSession()` itself would only be protected by middleware's "is there a cookie" check — meaning any logged-in user of *any* role could reach it, not just admins. Six pages had exactly this gap; all are now fixed. The lesson embedded in this architecture note: **every single page that needs restricted access must call `getServerSession()` itself** — there is no shortcut via middleware alone.

## Data model, by domain

- **Identity**: `User`, `FreelancerProfile`, `Certification`, `PortfolioItem`, `Education`
- **Marketplace listings**: `Category`, `Gig`, `GigPackage`, `GigFaqItem`, `Team`, `TeamMember`, `ProjectPosting`, `ProjectApplication`
- **Transactions**: `Order`, `Milestone`, `TeamOrder`, `Transaction`, `Withdrawal`, `Subscription`
- **Collaboration**: `Message`, `WorkspaceTask`, `WorkspaceNote`, `Review`
- **Scheduling**: `TrainerAvailability`, `TrainerAvailabilityException`
- **Platform operations**: `AuditLog`, `Notification`

Full field-level detail lives in `prisma/schema.prisma`, which is extensively commented — every non-obvious field has an inline explanation of *why* it exists, often referencing the specific milestone/phase that added it and the bug or gap that motivated it.

## Known, documented constraints

- **Session revocation** — fixed (Phase 67). `User.sessionsInvalidatedAt` is checked on every session read; admin suspension and password reset both invalidate any already-open session immediately, not just future logins.
- **Near-real-time, not real-time** — chat and notifications use short-interval polling (4–15 seconds), not WebSockets. No push infrastructure (Pusher/Ably/custom WebSocket server) is connected. Stated honestly in the UI and code rather than implied to be instant.
- **Payments are simulated** — see `PROJECT_STATUS.md` for the full list of what needs real credentials before going live (Stripe, email delivery, S3, OAuth).
- **Search uses `LIKE`-based substring matching, not fulltext** — a deliberate choice, carried over from the original MySQL reasoning and still valid on Postgres: fulltext search (`tsvector`/`to_tsquery`) is word-boundary and stemming-based, which would break this platform's short Oracle-module-acronym searches ("AP", "GL", "OIC") the same way MySQL's fulltext minimum-token-length would have. Adequate at current scale; a dedicated search service (Algolia/Meilisearch) would be the real fix at much higher scale.
- **Migrated from MySQL to PostgreSQL/Supabase** (see README Phase 68) — the 3 places using MySQL's `GET_LOCK`/`RELEASE_LOCK` for race-condition safety (workshop booking, workshop schedule editing, withdrawals) now use Postgres's `pg_try_advisory_xact_lock`, which is actually simpler: transaction-scoped, so it releases automatically on commit or rollback with no manual release call needed.
- **Migrated from custom JWT/bcrypt to Supabase Auth** (see README Phase 69) — identity itself now lives in Supabase's own `auth.users`, not this app's `User` table, which is a linked profile only. Account lockout (`failedLoginAttempts`/`lockedUntil`) is genuinely app-specific logic Supabase doesn't provide and was kept, enforced before ever calling Supabase's sign-in. **Not yet verified against a real, live Supabase project** — see `docs/SUPABASE_SETUP.md`'s note on this specifically.
