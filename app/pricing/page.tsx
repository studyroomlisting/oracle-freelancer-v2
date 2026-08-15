export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Pricing</h1>
      <div className="text-sm text-neutral-700 flex flex-col gap-6">
        <div className="card p-5">
          <h2 className="font-bold text-neutral-900 mb-2">For clients</h2>
          <p>
            Free to browse, search, and message freelancers. You only pay the price a freelancer or team sets for
            their gig, package, or engagement — there's no separate client fee on top.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-neutral-900 mb-2">For freelancers</h2>
          <p>
            OracleGigs takes a 20% platform commission on completed orders, deducted automatically from the
            payment — you set your own rates and packages, and the commission is factored in behind the scenes.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-neutral-900 mb-2">Oracle Team Pro</h2>
          <p>
            Freelancers can lead one team for free. Leading additional teams requires an Oracle Team Pro
            subscription — see your freelancer dashboard for current pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
