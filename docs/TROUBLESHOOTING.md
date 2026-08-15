# OracleGigs — Troubleshooting Guide

## Setup issues

### `npx prisma generate` fails, or the app won't start
Check `DATABASE_URL` in `.env` is a real, reachable MySQL connection string. Without it, most pages fall back to sample/demo data automatically (see "sample data mode" below) rather than crashing — but write actions (registration, checkout, messaging) require a real database and will show a clear "requires a connected database" message instead of failing silently.

### `next build` fails with a TypeScript error
This project has been re-verified clean through 100% of TypeScript compilation at every phase (confirmed with `✓ Compiled successfully`). If you hit a new error after making changes, it's almost always one specific, well-understood pattern: Prisma's inferred types can come back as `any` in certain sandboxed/pre-generate contexts, which cascades into "implicit any" errors on `.map()`/`.filter()`/`.reduce()` callbacks over query results. Fix: add an explicit type annotation — but annotate where the value is *received* (e.g., `const x: Map<string,string> = ...`), not just the callback's parameters, since TypeScript won't use a callback's return-type annotation to narrow anything once the source array itself is `any`.

### `next build` or the app fails with a Supabase env var error
As of the Supabase Auth migration (Phase 69), `JWT_SECRET` no longer exists or does anything — the custom JWT system it protected is gone. If auth-related code fails at build or runtime, check `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (for admin user-creation specifically) `SUPABASE_SERVICE_ROLE_KEY` are all set — see `docs/SUPABASE_SETUP.md`.

### Recharts / a new npm package won't install
Check `network_configuration` allowlists `registry.npmjs.org` (or your registry) if you're running this in a similarly sandboxed environment. In a normal deployment environment this isn't a concern.

## Sample data mode

When `DATABASE_URL` isn't set, most read-only pages (homepage, browse, gig/freelancer/team detail pages) automatically fall back to realistic sample data defined in `lib/sampleData.ts`, so the UI is fully browsable without a database connected. This is intentional, for local development and demos — write actions still correctly require a real database.

## Authentication issues

### A user can't log in after registering
Check whether Supabase's "Confirm email" setting is enabled for your project (Authentication → Providers → Email) — if so, they need to click the confirmation link Supabase sent before they can log in. That email is real if `EMAIL_PROVIDER_API_KEY` isn't involved at all here — Supabase sends its own auth emails directly, configured in the Supabase dashboard, not through this app's `lib/email.ts`.

### "Too many failed attempts" / account locked
Intentional — 5 failed logins locks the account for 15 minutes (`lib/businessRules.ts`). This clears automatically, or an admin can unsuspend (different from lockout, but the same "account temporarily blocked" symptom) via `/dashboard/admin/users`.

### A suspended user can still access the app
Shouldn't happen — `getServerSession()` checks `isSuspended` fresh, via a real database lookup, on every single request (Phase 69), so a suspension takes effect on their very next request regardless of their Supabase token's own remaining validity. If you're seeing otherwise, check whether the profile row's `isSuspended` flag actually got set (the admin suspend route sets it — confirm the request succeeded), not a token-expiry issue.

## Payment / order issues

### Payment always succeeds, even with garbage input
Expected — payments are simulated (no real Stripe connection). Use the "Simulate a declined payment" checkbox on the pay button to test the failure path specifically.

### An order's dashboard status doesn't match what I expect
Check the actual `OrderStatus` value in the database directly — the UI labels map 1:1 to it (`PENDING_PAYMENT`, `PENDING_ACCEPTANCE`, `IN_PROGRESS`, `DELIVERED`, `IN_REVISION`, `COMPLETED`, `CANCELLED`, `DISPUTED`). `DELIVERED` only appears once *all* milestones on the order are submitted; `IN_REVISION` only after the client explicitly requests changes.

## Messaging issues

### Messages aren't appearing instantly
Expected — chat is near-real-time polling (every 4 seconds), not push-based real-time. No WebSocket/Pusher/Ably infrastructure is connected. This is documented, not a bug.

## Admin issues

### A newly admin-created user can't log in
Expected — they're issued a random password (never a guessable default) and must use "Forgot password" to set their own, since there's no real email delivery to hand them a temporary password directly yet.

### Can't delete a user
Check whether they have any real activity (orders, gigs, teams led, project postings) — deletion is deliberately blocked in that case to protect historical data. Suspend instead.

## Where to look for more detail

Every phase of this build is documented in `README.md`'s changelog, in chronological order, each entry stating what was found, what was fixed, and why. If something behaves unexpectedly, searching that changelog for the relevant feature name is often the fastest way to understand the actual, deliberate design decision behind it — most surprising behaviors here are documented tradeoffs, not oversights.
