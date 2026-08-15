export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Privacy Policy</h1>
      <div className="card p-4 mb-8 bg-amber-50 border-amber-200 text-sm text-amber-800">
        Draft content — this has not been reviewed by a lawyer or a data-protection professional. Have this
        properly reviewed for GDPR/UK-GDPR compliance before real user data is collected.
      </div>
      <div className="text-sm text-neutral-700 flex flex-col gap-4">
        <p>Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        <h2 className="font-bold text-neutral-900 mt-2">What we collect</h2>
        <p>Account details (name, email), profile information you provide, messages sent through the platform, and order/booking history.</p>
        <h2 className="font-bold text-neutral-900 mt-2">How we use it</h2>
        <p>To operate the marketplace — matching clients with freelancers, processing bookings, sending order-related notifications, and improving the platform.</p>
        <h2 className="font-bold text-neutral-900 mt-2">Who we share it with</h2>
        <p>The other party in a booking or conversation sees what's needed to fulfil that transaction. We don't sell personal data to third parties.</p>
        <h2 className="font-bold text-neutral-900 mt-2">Your rights</h2>
        <p>You can request access to, correction of, or deletion of your personal data by contacting us.</p>
      </div>
    </div>
  );
}
