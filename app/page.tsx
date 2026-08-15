import Link from "next/link";
import GigCard from "@/components/GigCard";
import TopFreelancerCard from "@/components/TopFreelancerCard";
import { getFeaturedGigs, getCategories, getPlatformStats, getTopFreelancers } from "@/lib/queries";

const categoryIcons: Record<string, string> = {
  "oracle-fusion-scm": "📦",
  "oracle-fusion-hcm": "👥",
  "oracle-fusion-financials": "💷",
  "oracle-ebs": "🏢",
  "oracle-oic": "🔗",
  "oracle-apex": "💻",
  "oracle-epm": "📊",
};

export default async function HomePage() {
  const [gigs, trainerGigs, workshopGigs, categories, platformStats, topFreelancers] = await Promise.all([
    getFeaturedGigs("CONSULTING"),
    getFeaturedGigs("TRAINING"),
    getFeaturedGigs("WORKSHOP"),
    getCategories(),
    getPlatformStats(),
    getTopFreelancers(),
  ]);

  return (
    <div>
      {/* Hero — dark green, the one approved exception to the light-theme rule */}
      <section className="bg-gradient-to-br from-deep-light to-deep">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h1 className="text-3xl sm:text-[38px] font-extrabold text-white leading-tight max-w-xl mb-6">
            Find your perfect Oracle <span className="text-brand-500">freelancer</span>, quick and easy
          </h1>
          <form action="/browse" className="flex max-w-xl bg-white rounded-lg overflow-hidden shadow-xl">
            <input
              name="q"
              maxLength={200}
              className="flex-1 border-none px-4 py-4 text-[15px] outline-none text-neutral-900"
              placeholder="Try 'Fusion SCM inventory setup'"
            />
            <button type="submit" className="bg-brand-500 text-white px-6 font-bold hover:bg-brand-600">
              Search
            </button>
          </form>
          <div className="mt-6 flex items-center gap-6 flex-wrap">
            <div className="flex -space-x-2.5">
              {["P", "D", "G", "A"].map((letter) => (
                <div key={letter} className="w-9 h-9 rounded-full bg-neutral-700 border-2 border-deep text-white text-xs font-bold flex items-center justify-center">
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-100">
              <span className="block text-base font-bold text-white">420+</span>
              Verified Oracle consultants
            </p>
            <p className="text-xs text-emerald-100">
              <span className="block text-base font-bold text-white">4.9 ★★★★★</span>
              Average rating
            </p>
          </div>
        </div>
      </section>

      {/* Featured Categories — icon tiles */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl font-bold text-neutral-900 mb-1">Featured categories</h2>
        <p className="text-sm text-neutral-500 mb-6">Get inspiration from our most active Oracle modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="card p-5 text-center hover:border-brand-500 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-lg mx-auto mb-3">
                {categoryIcons[c.slug] ?? "⚙️"}
              </div>
              <p className="text-sm font-bold text-neutral-900 mb-1">{c.name}</p>
              <p className="text-xs text-neutral-500 line-clamp-1">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Our Services — Fiverr-style detailed seller cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">Featured Oracle gigs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {gigs.map((g) => (
            <GigCard key={g.slug} gig={g} />
          ))}
        </div>
      </section>

      {/* Project Teams CTA — dark green banner with real platform stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-gradient-to-br from-deep-light to-deep rounded-2xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center text-white">
          <div>
            <p className="text-brand-500 text-xs font-bold uppercase tracking-wide mb-2">Oracle Project Teams</p>
            <h2 className="text-2xl sm:text-[26px] font-extrabold leading-snug mb-3">
              Don't just hire one freelancer. Build a coordinated Oracle delivery team.
            </h2>
            <p className="text-sm text-emerald-100 mb-6 max-w-md">
              Small and medium businesses get the structure of a big consultancy — Solution Architect, functional
              consultants, PM — at independent-freelancer pricing.
            </p>
            <Link href="/teams" className="inline-flex items-center justify-center rounded bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-600">
              Explore Project Teams
            </Link>
            <div className="flex gap-3 mt-8">
              <div className="flex-1 bg-white/10 border border-white/15 rounded-lg p-4 text-center">
                <p className="text-xl font-extrabold">{platformStats.projectsCompleted}</p>
                <p className="text-[10px] text-emerald-100 uppercase">Projects delivered</p>
              </div>
              <div className="flex-1 bg-white/10 border border-white/15 rounded-lg p-4 text-center">
                <p className="text-xl font-extrabold">£{(platformStats.budgetDeliveredGbp / 1_000_000).toFixed(1)}M</p>
                <p className="text-[10px] text-emerald-100 uppercase">Budget delivered</p>
              </div>
              <div className="flex-1 bg-white/10 border border-white/15 rounded-lg p-4 text-center">
                <p className="text-xl font-extrabold">{platformStats.successRate.toFixed(0)}%</p>
                <p className="text-[10px] text-emerald-100 uppercase">Success rate</p>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center bg-white/5 border border-white/10 rounded-xl aspect-[4/3] text-emerald-100/60 text-sm text-center p-6">
            Team collaborating on an Oracle implementation
          </div>
        </div>
      </section>

      {trainerGigs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Learn from Oracle trainers</h2>
            <Link href="/trainers" className="text-sm font-semibold text-brand-700 hover:underline">
              See all trainers
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trainerGigs.map((g) => (
              <GigCard key={g.slug} gig={g} />
            ))}
          </div>
        </section>
      )}

      {workshopGigs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Upcoming workshops</h2>
            <Link href="/workshops" className="text-sm font-semibold text-brand-700 hover:underline">
              See all workshops
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {workshopGigs.map((g) => (
              <GigCard key={g.slug} gig={g} />
            ))}
          </div>
        </section>
      )}

      {/* Top Freelancers — WorkZone-style seller grid */}
      {topFreelancers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Top Oracle freelancers</h2>
            <Link href="/freelancers" className="text-sm font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {topFreelancers.map((f) => (
              <TopFreelancerCard key={f.slug} freelancer={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
