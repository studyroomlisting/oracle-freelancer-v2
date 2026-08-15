# OracleGigs — FROZEN REQUIREMENTS BASELINE

**Status: FROZEN as of this document's date.** This is the official, locked scope. No new features are being added beyond this list without a deliberate decision to reopen it. Anything not in the "IN SCOPE — BUILT" section below is explicitly **out of frozen scope** — whether or not it was discussed in passing, appeared in a reference document, or is a reasonable idea. If it's not listed as built, it is not part of this release.

Verified counts at freeze: **45 pages · 54 API routes · 39 components · 16 lib modules · 20 database tables · 14 enums · 95 automated tests, all passing.**

---

## IN SCOPE — BUILT AND FROZEN

### Public site
Home, Browse (gigs), Freelancer directory, Trainers, Workshops, Teams, Open Projects, individual gig/freelancer/team/project detail pages, category pages, About, Pricing, FAQ, Help Centre, Contact (real, working submission), Terms, Privacy, Cookies, custom 404, custom 500/global error page.

### Authentication & account
Register, login, logout, email verification, forgot/reset password, remember me, account lockout (5 failed attempts / 15 min), session management (JWT, httpOnly cookies), CSRF protection.

### Roles
Client, Freelancer, Admin. (Trainer/Company are not separate roles — a trainer is a freelancer with Training/Workshop gigs; a company is a client. This is a frozen design decision, not a gap.)

### Marketplace — gigs
Consulting, Training, and Workshop gig types, each with tiered packages. Creation, admin approval, search with pagination, atomic seat reservation, atomic training-conflict locking, booking, freelancer accept/decline before work starts, milestone submit/approve workflow, order auto-completion, reviews (real submission, real rating recomputation), cancellation, training reschedule.

### Marketplace — Oracle Project Teams
Pre-built team listings, Build-Your-Own-Team picker, AI Team Recommender with 3-option comparison, team engagement requests, replacement guarantee, roster management, Team Pro subscription with free-tier gating, team-order cancellation.

### Open Project Board
Post a brief, individual or team-based proposals, award (auto-generates a real Order or TeamOrder), application withdrawal, pagination.

### Collaboration
Messaging with near-real-time polling (4s interval — explicitly not push-based WebSocket real-time), read receipts, gig-contextual conversations ("Contact about this gig"), shared project workspace (assignable tasks, decision-log notes, provider/client RBAC).

### Admin
Pending gig/team/certification approvals, storage-mode diagnostic, user management (search, suspend/unsuspend).

### Engineering baseline
Full error handling on every API route, centralized error types, structured logging, ESLint with no-explicit-any enforced, extracted/tested business logic (pricing, seat limits, account lockout, review averaging), 95 automated tests, security-audited (see Phase 27 in the technical README for the full list of findings and fixes).

---

## EXPLICITLY OUT OF FROZEN SCOPE

These were identified during the gap-analysis review as genuinely buildable, but are not included in this freeze. Reopening this document is required before any of these are built:

- In-app/real-time notification center (currently email-only)
- Calendar view of bookings, earnings summary, admin platform reports
- Message search, typing indicators, file/image attachments in chat
- Workspace document/deliverable attachments
- Admin approval step for Open Project postings; posting edit/cancel before award; client-invites-freelancer flow; side-by-side proposal comparison UI
- Attendance certificates and invoices as PDFs
- Booking reminder emails
- Review moderation
- Off-platform-contact pattern flagging in chat

## OUT OF SCOPE — NEEDS YOUR CREDENTIALS, NOT A BUILD DECISION

- Real Stripe Connect (payments, connected accounts, identity verification, payouts, refunds)
- Real email delivery (currently console-logged; provider swap point is lib/email.ts)
- Production file storage (S3-compatible code exists; needs bucket credentials)
- OAuth login (Google/Microsoft/LinkedIn)
- True push-based real-time chat (Pusher/Ably or a custom WebSocket service)

## OUT OF SCOPE — REAL PRODUCT-DIRECTION DECISIONS, NOT GAPS

- Blog/CMS, Companies/Enterprise marketing pages
- Super Admin / Platform Admin / Support role split
- Formal project-management tooling inside the workspace (issues, risks, change requests, timesheets, meetings) — this product is "a marketplace with a lightweight workspace," not a Jira/Asana competitor, unless that's a deliberate pivot
- Dedicated search-indexing infrastructure (Elasticsearch/Algolia) — current Prisma-contains search is adequate at this scale

## KNOWN, DOCUMENTED LIMITATIONS OF WHAT'S BUILT

- No server-side session revocation — logout and account suspension both clear/block going forward, but an already-issued JWT remains valid until its 30-day expiry if it was copied elsewhere
- prisma generate / migrate / next build have never been run to completion in the environment this was built in (network policy blocked Prisma's engine binary download); webpack compilation is confirmed clean. Run these on your own machine before treating the build as verified.
- Terms/Privacy/Cookies pages are draft content with an on-page notice — not lawyer-reviewed
