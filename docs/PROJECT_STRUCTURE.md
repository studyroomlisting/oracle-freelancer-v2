# Project Structure — Frontend / Backend / Database

This is a **Next.js full-stack application**, not separate frontend/backend projects — Next.js's App Router deliberately co-locates UI pages and API routes in the same `app/` folder, and Server Components call the database directly without a separate API hop in between. That's the framework's actual architecture, not a lack of organization. Physically splitting this into standalone "frontend" and "backend" folders would break routing and require re-architecting how the app works — not something to do without a very deliberate, separate decision. What follows instead is an accurate map of which parts of the existing structure *are* which layer.

## Frontend — what renders in the browser

| Folder | What it is |
|---|---|
| `app/**/page.tsx` (58 files) | Every page/screen in the app — public pages, dashboards, auth screens |
| `components/` (62 files) | Reusable UI — forms, cards, buttons, charts, the notification bell, OAuth buttons, etc. |
| `app/globals.css`, `tailwind.config.ts` | Styling |
| `app/icon.svg` | Favicon |
| `public/` | Static assets — currently just the `uploads/` destination folders for user-submitted images at runtime, not source design assets |

## Backend — server-side logic and APIs

| Folder | What it is |
|---|---|
| `app/api/**/route.ts` (96 files) | Every API endpoint — auth, gigs, orders, payments, admin actions, reports |
| `app/auth/callback/route.ts` | The shared Supabase Auth callback — handles signup confirmation, magic-link, password-recovery, and OAuth redirects through one route |
| `middleware.ts` | Runs on every request — real Supabase session verification (not just a cookie-presence check), CSRF cookie setup |
| `lib/` (22 files) | Shared server logic: `auth.ts` (session handling), `supabase/server.ts` + `supabase/client.ts` (Supabase clients — split into two files so browser code never pulls in server-only code), `email.ts` (Resend integration), `storage.ts` (S3), `pricing.ts`, `analytics.ts`, `notifications.ts`, `audit.ts`, and more — the business logic every route calls into |
| `lib/__tests__/` | Automated tests (139) for the pure logic in `lib/` |

## Database

| File/Folder | What it is |
|---|---|
| `prisma/schema.prisma` | The entire database structure — 29 tables (Prisma calls them "models"), 21 enums, every field, every relationship. This *is* the database schema. |
| `prisma/seed.ts` | Database seeding script (`npm run db:seed`) |
| `.env` → `DATABASE_URL` / `DIRECT_URL` | Where the database actually lives — Supabase/PostgreSQL (see `docs/SUPABASE_SETUP.md`) |

### The 29 tables, grouped by what they're for

- **Identity**: User, FreelancerProfile, Certification, PortfolioItem, Education
- **Listings**: Category, Gig, GigPackage, GigFaqItem, GigExtra, Team, TeamMember, ProjectPosting (includes detailed Oracle-support-ticket-style fields — business process, error code, severity, priority, pricing type, plus file attachments via ProjectPostingAttachment), ProjectPostingAttachment, ProjectApplication
- **Transactions**: Order, Milestone, TeamOrder, Transaction, Withdrawal, Subscription
- **Collaboration**: Message, WorkspaceTask, WorkspaceNote, Review
- **Scheduling**: TrainerAvailability, TrainerAvailabilityException
- **Platform operations**: AuditLog, Notification

## Everything else at the top level

| File | What it is |
|---|---|
| `package.json` | Every dependency the frontend and backend both need (one shared list — Next.js doesn't separate these) |
| `tsconfig.json`, `.eslintrc.json`, `next.config.js`, `postcss.config.js` | Build/tooling configuration |
| `.env.example` | Every environment variable needed, with explanations |
| `.gitignore` | What's excluded from version control — critically, this is where real secrets (`.env`) are kept out |
| `README.md` | The full, phase-by-phase build history — every feature, every bug found and fixed |
| `PROJECT_STATUS.md` | Current, honest state of the whole project |
| `docs/` | `USER_GUIDE.md`, `ADMIN_GUIDE.md`, `ARCHITECTURE.md`, `TROUBLESHOOTING.md`, `SUPABASE_SETUP.md`, this file |

## If you actually need physically separate frontend/backend projects

That's a real, valid architecture for some teams (a separate API server + a separate frontend app calling it) — but it's a different, larger decision than reorganizing folders, since it changes how data fetching works throughout the entire app (Server Components currently query the database directly; a split architecture would need every one of those converted to call a real HTTP API instead). Tell me explicitly if that's actually what you want, and we can talk through what it would take — but it isn't something to do silently as a "just reorganize the zip" request.
