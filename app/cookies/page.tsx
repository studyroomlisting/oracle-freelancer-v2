export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Cookie Policy</h1>
      <div className="card p-4 mb-8 bg-amber-50 border-amber-200 text-sm text-amber-800">
        Draft content — review before real launch.
      </div>
      <div className="text-sm text-neutral-700 flex flex-col gap-4">
        <p>We use a small number of cookies, all essential to the platform functioning:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Session cookie</strong> — keeps you signed in</li>
          <li><strong>CSRF cookie</strong> — protects the login and registration forms from cross-site request forgery</li>
        </ul>
        <p>We don't currently use advertising or third-party tracking cookies.</p>
      </div>
    </div>
  );
}
