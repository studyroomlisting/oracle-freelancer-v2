# Supabase Setup — Developer Handoff

This project's database AND authentication now both target Supabase (see README Phases 68 and 69, `ARCHITECTURE.md`). This guide is everything needed to actually connect it to a real Supabase project and start working.

## What's already done (don't redo this)

- `prisma/schema.prisma` targets `postgresql`, not `mysql` — 28 models, all Postgres-compatible
- The 3 places needing real race-condition locking (workshop booking, workshop schedule edits, withdrawals) use Postgres's `pg_try_advisory_xact_lock`, not MySQL's `GET_LOCK`
- **Authentication is fully migrated to Supabase Auth** — no more custom JWT/bcrypt. Registration, login, logout, password reset, and magic-link login all call Supabase's own Auth API. `middleware.ts` does real, authoritative session verification (not just a cookie-presence check — a limitation this migration specifically removed, see `ARCHITECTURE.md`)
- `.env.example` has every required variable, in the correct format, with explanatory comments

## What you need to do

### 1. Create the Supabase project
[supabase.com](https://supabase.com) → New project. Pick a strong database password and save it.

### 2. Get your database connection strings
Project Settings → Database → Connection string. You need **both**:
- **Connection pooling** (port `6543`, `?pgbouncer=true`) → `DATABASE_URL`
- **Direct connection** (port `5432`) → `DIRECT_URL`

Both are required — Prisma's migration engine needs the direct connection; PgBouncer doesn't support the prepared statements migrations rely on.

### 3. Get your Auth API keys
Project Settings → API:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose to the browser — Row Level Security is the actual protection, not secrecy of this key)
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` — **never expose this one to the browser.** It's used server-only, specifically by the admin-created-user feature (`/dashboard/admin/users`), which needs Supabase's elevated Admin API to create a real login for someone directly.

### 4. Configure Auth settings in the Supabase dashboard — this step is easy to skip and matters
Authentication → Email Templates: customize the templates for **Confirm signup**, **Magic Link**, and **Reset Password** — Supabase sends these emails itself now; this app's own `lib/email.ts` no longer controls their content (it still sends everything else — order updates, messages, disputes, payments).

Authentication → URL Configuration: set your **Site URL** and add `/auth/callback` to **Redirect URLs** (e.g. `https://your-domain.com/auth/callback` and `http://localhost:3000/auth/callback` for local dev). Every email link (signup confirmation, magic link, password reset) redirects through this one shared callback route — if it's missing from the allowed redirect list, Supabase will reject the redirect and the whole flow breaks silently.

Authentication → Providers → Email: check whether **"Confirm email"** is enabled. If it is, a new user can't log in until they click the confirmation link — decide if that's the behavior you want (the previous custom system did *not* block dashboard access on verification, only showed a reminder banner; Supabase's default may behave differently until you configure this explicitly).

### 4b. Google and Apple login
"Continue with Google" / "Continue with Apple" buttons are already built (login and register pages) and wired to Supabase's OAuth flow — but Supabase needs real credentials for each provider before either button will actually work; without this, clicking them will show an error from Supabase, not from this app's code.

- **Google**: Authentication → Providers → Google, toggle it on. You need a Client ID and Secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — create an OAuth 2.0 Client ID there (type: Web application), and add Supabase's callback URL (`https://[project-ref].supabase.co/auth/v1/callback`, shown in the Supabase provider settings) to Google's "Authorized redirect URIs".
- **Apple**: Authentication → Providers → Apple, toggle it on. Requires a Services ID, Team ID, Key ID, and private key from an [Apple Developer](https://developer.apple.com/account) account with "Sign in with Apple" configured — genuinely more involved to set up than Google's, and requires a paid Apple Developer Program membership.

Both are entirely configured in the Supabase dashboard — no code or environment variable changes are needed on this app's side once they're enabled there.

### 5. Run the initial migration
```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### 6. Confirm it's actually working — genuinely test the full auth flow, not just that the homepage loads
```bash
npm run dev
```
Register a real test account, confirm you receive Supabase's email, click through it, and confirm you land back in the app logged in. Then test logout, then test "Forgot password", then test the magic-link login. **This is the one part of the entire project I could not verify myself** — I have no live Supabase project to test against, so everything auth-related has been built carefully against Supabase's documented API and verified to compile cleanly, but not verified to actually work end-to-end against a real instance. Please genuinely click through all of it before trusting it.

## What's still simulated/stubbed, unrelated to any of this

Payments, real email delivery for non-auth emails, and file storage all remain as documented in `PROJECT_STATUS.md` — this Supabase work doesn't touch any of those.
