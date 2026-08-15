import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

const categories = [
  { slug: "oracle-fusion-scm", name: "Fusion SCM" },
  { slug: "oracle-fusion-hcm", name: "Fusion HCM" },
  { slug: "oracle-ebs", name: "EBS" },
  { slug: "oracle-oic", name: "OIC" },
  { slug: "oracle-apex", name: "APEX" },
  { slug: "oracle-fusion-financials", name: "Fusion Financials" },
];

export default async function Navbar() {
  // FIXED (security/UX review): this was previously a static server
  // component that always rendered "Sign in" / "Join", even for a logged-in
  // user — meaning there was no way to reach the newly-added logout
  // endpoint from the UI at all. Now session-aware.
  const session = await getServerSession();
  const dashboardHref = session
    ? session.role === "FREELANCER"
      ? "/dashboard/freelancer"
      : session.role === "ADMIN"
        ? "/dashboard/admin"
        : "/dashboard/client"
    : null;

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[70px] items-center gap-7">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-neutral-900 whitespace-nowrap">
            Oracle<span className="text-brand-500">Gigs</span>
          </Link>

          <form action="/browse" className="hidden md:flex flex-1 max-w-md border border-neutral-900 rounded overflow-hidden">
            {/* Search every gig type at once (Consulting, Training, Workshop) —
                see app/browse/page.tsx for what "ALL" means there. */}
            <input type="hidden" name="type" value="ALL" />
            <input
              name="q"
              className="flex-1 border-none px-3.5 py-2.5 text-sm outline-none"
              placeholder="What Oracle skill are you looking for?"
              aria-label="Search gigs"
            />
            <button type="submit" className="bg-neutral-900 text-white px-4" aria-label="Search">
              🔍
            </button>
          </form>

          <nav className="flex items-center gap-5 ml-auto">
            {/* FIXED (real gap found during review): the search form above
                is intentionally desktop-only (no room for it in the mobile
                navbar) — but that previously meant NO way to reach search
                at all on mobile, since /browse itself also had no search
                box of its own (also fixed, same pass). This link takes a
                mobile user straight to /browse, which now has a real,
                visible search input. Placed inside this existing
                right-aligned nav group rather than as its own competing
                ml-auto sibling, to avoid any ambiguity in how two
                independent auto-margins would actually resolve. */}
            <Link href="/browse" className="md:hidden text-lg" aria-label="Search gigs">
              🔍
            </Link>
            {session ? (
              <>
                <NotificationBell />
                {/* FIXED (real gap found during review, same class as the
                    search gap this same phase): "Messages" and "Dashboard"
                    were both hidden below the sm: breakpoint with no
                    fallback at all — a logged-in user on mobile had no way
                    to navigate to either from the navbar, on any page.
                    These icon links are the mobile equivalent, hidden on
                    desktop (sm:hidden) where the full text labels already
                    work, so nothing is duplicated there. */}
                <Link href="/messages" className="sm:hidden text-lg" aria-label="Messages">
                  💬
                </Link>
                <Link href={dashboardHref!} className="sm:hidden text-lg" aria-label="Dashboard">
                  📊
                </Link>
                <Link href="/messages" className="hidden sm:inline text-sm font-semibold text-neutral-800 hover:text-neutral-900">
                  Messages
                </Link>
                <Link href={dashboardHref!} className="hidden sm:inline text-sm font-semibold text-neutral-800 hover:text-neutral-900">
                  Dashboard
                </Link>
                {/* FIXED (real gap found during review): no Settings page
                    existed at all, and nothing linked to it once built —
                    desktop-only, unlike Messages/Dashboard, since it's
                    lower-frequency and the mobile nav is already fairly
                    full. */}
                <Link href="/dashboard/settings" className="hidden sm:inline text-sm font-semibold text-neutral-800 hover:text-neutral-900">
                  Settings
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="btn-secondary">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/register" className="hidden sm:inline text-sm font-semibold text-neutral-800 hover:text-neutral-900">
                  Become a Seller
                </Link>
                <Link href="/auth/login" className="text-sm font-semibold text-neutral-800 hover:text-neutral-900">
                  Sign in
                </Link>
                <Link href="/auth/register" className="btn-secondary">
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-10 items-center gap-5 overflow-x-auto">
            <Link href="/browse" className="text-xs font-bold text-neutral-900 whitespace-nowrap">
              Consultants
            </Link>
            <Link href="/freelancers" className="text-xs font-bold text-neutral-500 hover:text-neutral-900 whitespace-nowrap">
              Find a Freelancer
            </Link>
            <Link href="/trainers" className="text-xs font-bold text-neutral-500 hover:text-neutral-900 whitespace-nowrap">
              Trainers
            </Link>
            <Link href="/workshops" className="text-xs font-bold text-neutral-500 hover:text-neutral-900 whitespace-nowrap">
              Workshops
            </Link>
            <Link href="/teams" className="text-xs font-bold text-neutral-500 hover:text-neutral-900 whitespace-nowrap">
              Project Teams
            </Link>
            <Link href="/projects" className="text-xs font-bold text-neutral-500 hover:text-neutral-900 whitespace-nowrap">
              Open Projects
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-6 overflow-x-auto">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 whitespace-nowrap"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
