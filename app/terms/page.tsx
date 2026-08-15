export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Terms of Service</h1>
      <div className="card p-4 mb-8 bg-amber-50 border-amber-200 text-sm text-amber-800">
        Draft content — this has not been reviewed by a lawyer. Have qualified legal counsel review and finalize
        this page before it governs real transactions or real user data.
      </div>
      <div className="text-sm text-neutral-700 flex flex-col gap-4">
        <p>Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        <h2 className="font-bold text-neutral-900 mt-2">1. The platform</h2>
        <p>
          OracleGigs is a marketplace connecting clients with independent freelancers offering Oracle-related
          consulting, training, and project delivery services. We are not a party to the contracts formed between
          clients and freelancers through the platform.
        </p>
        <h2 className="font-bold text-neutral-900 mt-2">2. Accounts</h2>
        <p>
          You're responsible for the accuracy of the information on your account and for keeping your login
          credentials secure. Accounts found to violate these terms may be suspended.
        </p>
        <h2 className="font-bold text-neutral-900 mt-2">3. Fees</h2>
        <p>See our Pricing page for current commission rates and subscription costs.</p>
        <h2 className="font-bold text-neutral-900 mt-2">4. Conduct</h2>
        <p>
          Attempting to circumvent the platform's fees by arranging payment outside OracleGigs for a service
          discovered here is not permitted.
        </p>
        <h2 className="font-bold text-neutral-900 mt-2">5. Liability</h2>
        <p>
          OracleGigs is provided "as is." We do not guarantee the quality, accuracy, or outcome of any freelancer's
          work.
        </p>
      </div>
    </div>
  );
}
