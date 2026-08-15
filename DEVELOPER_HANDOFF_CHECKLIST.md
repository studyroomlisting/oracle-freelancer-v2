# OracleGigs — Complete Development Checklist (Handoff)

Verified against the actual codebase on the date of this export — not from memory. 33 pages, 46 API routes, 38 components, 20 database tables, 95 automated tests, all passing.

## ✅ DONE — Core Marketplace

- [x] User registration (client/freelancer), login, logout, session management (JWT, httpOnly cookies)
- [x] Email verification flow (token + verify page + non-blocking dashboard reminder)
- [x] Account lockout after repeated failed logins (independent of IP-based rate limiting)
- [x] Freelancer profiles — headline, bio, rates, certifications, trust-score display
- [x] Gig listings — Consulting, Training, and Workshop types, each with tiered packages (Basic/Standard/Premium)
- [x] Gig creation form, admin approval workflow (approve/reject with reason + email notification)
- [x] Search and browse with filters (category, gig type) and **pagination**
- [x] Dedicated trainer directory (`/trainers`) and workshop directory (`/workshops`)
- [x] Trainer weekly availability + exception scheduling; real slot-conflict checking at booking time
- [x] Gig checkout / order creation, including **atomic seat reservation** (no overbooking race) and **atomic training-conflict locking** (no double-booking race)
- [x] Order detail page: status, milestones, package info
- [x] **Milestone workflow**: freelancer submits → client approves → order auto-completes when all milestones approved
- [x] **Reviews**: client reviews a completed order once; freelancer's real rating average recomputes automatically
- [x] **Order cancellation** (client or freelancer, from cancellable states only)
- [x] **Training session reschedule** (re-validated against the trainer's real availability)
- [x] Simulated payment flow (clearly labeled — see "Needs your credentials" below)

## ✅ DONE — Oracle Project Teams

- [x] Pre-assembled team listings with trust scores, day rate, project history
- [x] "Build Your Own Team" picker with live cost calculation
- [x] AI Team Recommender (questionnaire → role recommendations → 3-option Budget/Balanced/Premium comparison)
- [x] Team engagement requests (deposit → workspace → SOW/NDA generation)
- [x] **Replacement guarantee** — mark a member unavailable, get ranked candidate suggestions, add a replacement
- [x] Team roster management page for team leaders
- [x] Team Pro subscription with free-tier gating (lead 1 team free, unlimited with subscription)
- [x] Team-order cancellation

## ✅ DONE — Open Project Board (Corporate Project Matching)

- [x] Clients post project briefs (title, description, budget range, timeline)
- [x] **Individual freelancers or teams** (via their leader) submit competing proposals
- [x] Client reviews and accepts one — automatically generates a real Order (individual) or TeamOrder (team)
- [x] Application withdrawal
- [x] Pagination on the listings page

## ✅ DONE — Collaboration & Communication

- [x] Direct messaging with read receipts, inbox, thread view
- [x] Shared project workspace per order/engagement: task list (create, assign, status-cycle) + decision-log notes
- [x] Workspace RBAC: only the provider side can mark a task Done; only a note's author can delete it
- [x] Email notification triggers for every major event (order confirmed, gig approved/rejected, new message, milestone submitted/approved, order completed/cancelled, review received, welcome, verification) — see "Needs your credentials" for actual delivery

## ✅ DONE — Admin

- [x] Admin dashboard: pending gig approvals, pending team approvals, pending certification verifications
- [x] Storage-mode diagnostic banner (warns if running on local disk, which breaks on serverless)

## ✅ DONE — Security (audited and fixed, not just built)

- [x] bcrypt password hashing, JWT sessions, CSRF protection on auth forms
- [x] Rate limiting on login/register/messages
- [x] Fail-fast on missing JWT secret in production (was previously a silent vulnerability)
- [x] No password-hash leakage in any API response (audited and fixed 2 instances)
- [x] Secure cookie flags in production
- [x] Login timing-attack normalization
- [x] Consistent, correct authorization checks on every order/workspace/application page (audited and fixed 2 access-control bugs)
- [x] Search confirmed injection-safe (parameterized Prisma queries)
- [x] No XSS surface (no `dangerouslySetInnerHTML` anywhere)
- [x] Message threads confirmed correctly scoped (no IDOR)

## ✅ DONE — Engineering Quality

- [x] Every one of the 46 API routes has real error handling (was 2/46 before an audit found this)
- [x] Centralized error types and consistent JSON error responses
- [x] Structured logging (console-based; swap point for Sentry documented)
- [x] `app/error.tsx` and `app/global-error.tsx` — no more raw default error pages
- [x] ESLint configured with `no-explicit-any` enforced going forward
- [x] Shared utilities extracted to eliminate duplicated logic: slug generation, platform-fee math, team-pricing math, business-rule gating (seat limits, team-leading limits, account lockout)
- [x] 95 automated tests covering business logic, access control, pricing, and error handling
- [x] Full database schema (20 tables) seeded with realistic sample data across all 7 Oracle categories

## ⚠️ NEEDS YOUR CREDENTIALS — code is real and ready, just needs keys

- [ ] **Stripe** — all payment UI/flow exists and is wired to simulate; needs your Stripe account to go live
- [ ] **Real email delivery** — every trigger point exists and is tested; needs a provider key (Resend/SendGrid/SES) — one file to change (`lib/email.ts`)
- [ ] **Production file storage** — real S3-compatible upload code exists; needs your bucket credentials (falls back to local disk otherwise, which doesn't work on Vercel)

## ⚠️ NEEDS A BUILD VERIFICATION ON YOUR MACHINE

- [ ] `npx prisma generate`, `npx prisma migrate dev`, `npm run build` — these could not be run to completion in the environment this was built in (network policy blocked Prisma's engine binary download). Webpack compilation was confirmed clean; the Prisma-dependent type-check phase was not. **This is the one item that genuinely needs to happen before calling this done.**

## ❌ NOT BUILT — real scope decisions, not bugs

- [ ] Forgot/reset password flow
- [ ] OAuth / social login
- [ ] "Remember me" on login
- [ ] Dark mode
- [ ] Blog / CMS / About / Contact / Pricing / FAQ marketing pages
- [ ] Workshop attendance certificates
- [ ] Push notifications
- [ ] Off-platform-contact detection in chat (phone/email/social pattern blocking)
- [ ] Full API-route integration test coverage (current tests cover business logic and access control; no test yet exercises a full HTTP request/response cycle against a real database)

---

**Bottom line for the developer:** every coding task from the product scope has been built, tested where testable, and security-audited. The three "needs credentials" items are copy-paste integration work once accounts exist. The one build-verification item is the single gate between "should work" and "confirmed works" — run it first.
