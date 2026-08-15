import Link from "next/link";
import type { TopFreelancer } from "@/lib/queries";

export default function TopFreelancerCard({ freelancer }: { freelancer: TopFreelancer }) {
  const isTopRated = freelancer.sellerLevel === "Top Rated Seller";
  return (
    <Link href={`/freelancers/${freelancer.slug}`} className="card p-5 text-center relative hover:shadow-md transition-shadow">
      {isTopRated && (
        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
          Top Seller
        </span>
      )}
      <div className="w-14 h-14 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 mt-2">
        {freelancer.name.charAt(0)}
      </div>
      <p className="text-sm font-bold text-neutral-900">{freelancer.name}</p>
      <p className="text-xs text-neutral-500 mb-1 line-clamp-1">{freelancer.headline}</p>
      <p className="text-xs text-neutral-500 mb-3">
        <span className="stars">★</span> {freelancer.ratingAvg.toFixed(1)} ({freelancer.ratingCount})
        {freelancer.isCertified && <span className="badge-certified ml-1">✓</span>}
      </p>
      <span className="text-xs font-bold text-brand-700">View Profile</span>
    </Link>
  );
}
