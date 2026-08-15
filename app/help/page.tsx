import Link from "next/link";

const topics = [
  { title: "Getting started", items: ["Creating an account", "Verifying your email", "Choosing client vs freelancer"] },
  { title: "Booking & payments", items: ["How checkout works", "Order acceptance", "Cancelling a booking", "Rescheduling training"] },
  { title: "For freelancers", items: ["Creating a gig", "Setting your availability", "Getting approved", "Understanding commission"] },
  { title: "Teams & projects", items: ["Building a team", "The AI recommender", "Applying to Open Projects"] },
];

export default function HelpCentrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Help Centre</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Browse topics below, or check our <Link href="/faq" className="text-brand-600 hover:underline">FAQ</Link>, or{" "}
        <Link href="/contact" className="text-brand-600 hover:underline">contact us</Link> directly.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {topics.map((t) => (
          <div key={t.title} className="card p-5">
            <p className="text-sm font-bold text-neutral-900 mb-2">{t.title}</p>
            <ul className="text-sm text-neutral-600 flex flex-col gap-1">
              {t.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
