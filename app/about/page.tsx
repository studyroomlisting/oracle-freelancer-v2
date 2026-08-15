export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">About OracleGigs</h1>
      <div className="text-sm text-neutral-700 flex flex-col gap-4">
        <p>
          OracleGigs is a marketplace built specifically for the Oracle ecosystem — Fusion SCM, HCM, Financials,
          EBS, OIC, APEX, and EPM. We connect companies with independent Oracle consultants, trainers, and
          coordinated implementation teams, without the overhead of a traditional consultancy.
        </p>
        <p>
          Unlike general freelance marketplaces, every gig, team, and project here is scoped around real Oracle
          modules and real implementation work — from a single configuration task to a full coordinated project
          team with a Solution Architect at the helm.
        </p>
        <p>
          We're independent and not affiliated with Oracle Corporation. "Oracle" and related product names are
          used to describe the skills and services offered by freelancers on our platform.
        </p>
      </div>
    </div>
  );
}
