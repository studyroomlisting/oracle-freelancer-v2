# OracleGigs — Admin Guide

Everything an admin can do, at `/dashboard/admin` and its sub-pages. Written against the actual current build.

## Getting an admin account

There's no self-service way to become an admin — admin accounts are created directly in the database (seed data) or by promoting a user manually. The in-app **role-change tool** deliberately cannot create an admin (see "Users" below) — that's a security boundary, not an oversight.

## The main dashboard (`/dashboard/admin`)

Shows at a glance: pending gig/project/team approvals, certification verification requests, open disputes, and (if a database is connected) a **Platform reports** summary — total users, total orders, platform revenue (the 20% commission specifically, not gross payment volume), and open disputes, plus a 6-month revenue chart.

**This page requires an ADMIN-role session — nothing here is visible to clients or freelancers**, even if they're logged in.

## Approving content

Four separate approval queues, all on the main dashboard, all working the same way: **Approve** (goes live) or **Reject** (requires a reason, sent to the submitter, who can edit and resubmit):

- **Gigs** — a freelancer's service listing
- **Projects** — a client's posted requirement
- **Teams** — a freelancer-led team, before it's publicly bookable
- **Certifications** — a freelancer's uploaded credential, before the "Oracle Certified" badge appears on their profile

Nothing goes live on the platform without passing through one of these queues first — this is a deliberate, consistent design across every listing type.

## Managing gigs (`/dashboard/admin/gigs`)

A searchable, paginated list of every active gig. Toggle **Featured** on any of them — featured gigs show first on the homepage; if fewer than 8 are curated, the section fills in with the highest-rated recent gigs automatically so it's never sparse or fully arbitrary.

## Managing users (`/dashboard/admin/users`)

- **Search** by name or email.
- **Create a user** directly — restricted to Client or Freelancer roles only (never Admin, from this form). They'll need "Forgot password" to actually sign in, since there's no real email delivery to hand them a temporary password directly.
- **Edit** a user's name/email.
- **Suspend/Unsuspend** — blocks login immediately, and also invalidates any already-open session right away (fixed Phase 67) — a suspended user is locked out immediately, not just on their next login attempt.
- **Change role** — Client ⇄ Freelancer only. Converting to freelancer creates a blank profile. Converting away from freelancer is blocked if they have any gigs or teams — suspend instead if the account needs to stop operating but has real history.
- **Delete** — only allowed if the account has zero real activity (no orders, gigs, teams, or project postings). An account with any history can't be deleted, to protect that data — suspend it instead.

## Disputes

Open disputes appear on the main dashboard. For each one, you can:
- **Refund** the client — full amount (cancels the order) or a partial amount (a goodwill credit; the order continues)
- **Release** to the freelancer — approves any outstanding milestones and completes the order
- **Dismiss** — the order simply resumes, no financial event

Both parties are emailed the outcome and your resolution notes either way.

## Reports (`/dashboard/admin/reports`)

Four real operational reports, each filterable by date range (defaults to the last 90 days, capped at 2 years to keep queries fast):

- **Orders report** — totals by status and by category
- **Payment report** — totals by transaction type, plus a failed-payment count
- **Freelancer performance** — completed orders, rating, total earned, per freelancer
- **Client activity** — orders placed and total spend, per client

Each has **Export CSV** and **Export PDF** links. The CSV is genuinely CSV (Excel-compatible, opens natively in Excel/Sheets/Numbers) — not a native `.xlsx` binary file, which would need a different, heavier dependency.

## Audit log (`/dashboard/admin/audit-log`)

A read-only, append-only record of every admin action: who did what, to what, and when. Logged automatically whenever you suspend/unsuspend/delete/role-change a user, approve/reject a gig/project/team, verify a certification, or resolve a dispute. There is no edit or delete capability for this log by design — an audit trail that can be altered after the fact isn't one.

## Known limitations worth knowing as an admin


- **No Super Admin / multi-tier admin roles** — every admin has identical, full access. If you need a restricted "support agent" role that can't do everything a full admin can, that's a real, separate feature to request, not something toggled on here.
