const faqs = [
  { q: "Is OracleGigs affiliated with Oracle Corporation?", a: "No. We're an independent marketplace for freelancers with Oracle skills. \"Oracle\" and related product names describe the services offered, not an official partnership." },
  { q: "How do I book a consultant?", a: "Browse or search for a gig, pick a package, and check out. For training, you'll also choose a session time based on the trainer's real availability." },
  { q: "What's the difference between a gig and a Project Team?", a: "A gig is a fixed-scope service from one freelancer. A Project Team is a coordinated group (Solution Architect, functional consultants, PM) for larger implementations." },
  { q: "Can I message a freelancer before booking?", a: "Yes — use \"Contact about this gig\" on any gig page, or \"Contact me\" on a freelancer's profile." },
  { q: "What happens after I pay for an order?", a: "The freelancer must accept the order before work begins. If they can't take it on, they can decline and you'll be notified." },
  { q: "How do reviews work?", a: "Once an order is marked complete, the client can leave a rating and comment, which updates the freelancer's public rating." },
  { q: "Can I cancel a booking?", a: "Yes, from the order page, while it's awaiting payment, awaiting freelancer acceptance, or in progress." },
  { q: "How do I apply to a posted project?", a: "Visit the Open Projects board, find a brief that fits, and submit a proposal — as yourself or on behalf of a team you lead." },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Frequently asked questions</h1>
      <div className="flex flex-col gap-4">
        {faqs.map((f) => (
          <div key={f.q} className="card p-5">
            <p className="text-sm font-bold text-neutral-900 mb-1">{f.q}</p>
            <p className="text-sm text-neutral-600">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
