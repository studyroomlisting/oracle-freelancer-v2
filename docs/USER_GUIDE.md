# OracleGigs — User Guide

For clients and freelancers using the platform. Written against the actual current build (Phase 60) — every feature described here exists in the codebase, not aspirationally.

## Getting Started

1. **Register** at `/auth/register` as either a **Client** (hiring) or **Freelancer** (offering services).
2. **Verify your email** — Supabase sends this link directly (configured in the project's dashboard, not by this app) — click it to confirm your account and you'll be signed in automatically.
3. **Complete onboarding** at `/onboarding` — freelancers set a headline, bio, skills, experience, rate, photo, and optional resume; clients enter company details. You can save partial progress and finish later, or skip entirely and fill it in afterward from your profile settings.
4. **Forgot your password?** Use `/auth/forgot-password`, or sign in without a password at all via **Magic Link** (`/auth/magic-link/request`) — a one-time emailed link, no password needed.

## As a Client

### Finding help
- **Browse gigs** at `/browse` — filter by module, budget, Oracle-certified sellers only, and sort by rating/price/newest.
- **Browse the freelancer directory** at `/freelancers` directly, if you'd rather pick a person than a service listing.
- **Post a project** at `/projects/new` instead, if you want freelancers to propose to you rather than picking a fixed-price gig — post a brief, budget range, and timeline; an admin approves it before it goes live, then freelancers (or teams) submit proposals for you to review and award.
- **Hire a coordinated team** at `/teams` — either pick a pre-built team, use the **AI Team Recommender** (`/teams/recommend`) to get a suggested composition from a few questions, or **build your own** (`/teams/build`) role by role.

### Booking and paying
- Pick a package on a gig, check out — payment is currently **simulated** (no real card is charged), but the flow is real: the freelancer must explicitly accept your order before work starts.
- Once accepted, track progress via **milestones** on the order page. When the freelancer marks a milestone delivered, you can **Approve** it (releasing payment) or **Request changes** with a note — they'll resubmit.
- **Download a Contract or Invoice** PDF from the order page once payment has cleared.
- **Cancel** an order (with a refund logged) while it's unpaid, awaiting acceptance, or still in progress.
- **Raise a dispute** if something goes wrong mid-order — an admin reviews and resolves it (full/partial refund, release to freelancer, or dismiss).

### After the work is done
- **Leave a review** once an order is marked Completed.
- Check your **Payment history** at `/dashboard/payments`.
- See real-time updates via the **notification bell** in the top navigation, or the full history at `/dashboard/notifications`.

## As a Freelancer

### Setting up
- Complete your profile: headline, bio, categories/skills, hourly rate, portfolio, education, certifications (admin-verified), and a resume.
- Toggle your profile **public or private** at any time from your profile settings.

### Creating and managing gigs
- **Create a gig** at `/dashboard/freelancer/gigs/new` — Consulting, Training, or Workshop, each with their own pricing/scheduling fields. You can **Save as draft** and submit later, or submit straight away.
- Every gig needs **admin approval** before it's publicly visible — same as project postings and teams.
- From your dashboard, manage each gig's lifecycle: **Edit**, **Submit for review**, **Hide/Make visible**, **Archive**, **Duplicate** (clone as a new draft), or **Delete** (only if it has no order history — archive instead if it does).
- Set your **availability** for training sessions at `/dashboard/freelancer/availability`.

### Working an order
- **Accept or decline** a newly paid order.
- Submit milestones as you complete work ("Mark delivered") — the order status updates automatically so the client can see what's awaiting their review.
- If a client requests changes, you'll see their note directly on the order page — make the change and resubmit.
- Use the **shared workspace** (linked from the order page) for tasks and decision-log notes with the client.

### Getting paid
- Approved milestones show up immediately as real ledger entries.
- Check your **wallet balance** and **earnings chart** right on your dashboard, or the full breakdown at `/dashboard/payments`.
- **Withdraw** your available balance at any time (simulated as instant, same honesty as the rest of the payment system — there's no real bank transfer connected yet).

### Teams and projects
- **Lead a team**: build one, invite members by their profile slug, and it goes through the same admin-approval process as a gig.
- **Browse Open Projects** at `/projects` and apply — as yourself or on behalf of a team you lead.

## Messaging

- Message anyone directly from their gig page ("Contact about this gig") or profile ("Contact me"), or from `/messages`.
- Chat updates every few seconds automatically (not instant push — there's no live chat server connected — but you won't need to manually refresh).
- Attach an image or PDF to any message.
- See who's recently active via the green "Online now" indicator on profiles and gig pages.

## Notifications

- The bell icon in the top navigation shows unread notifications for order updates, payments, and new messages, polled automatically.
- Full history and "mark all read" at `/dashboard/notifications`.

## A note on what's real vs. simulated

Everything described above is a real, working feature in the codebase. The one category that's honestly a simulation rather than a live integration is **payment processing itself** — no real card is charged, no real bank transfer moves money. Everything *around* payment (order status, milestones, disputes, refunds, the wallet, invoices) is fully real and will continue working exactly the same way once a real payment processor is connected.
