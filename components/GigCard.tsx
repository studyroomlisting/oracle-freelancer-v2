import Link from "next/link";

export type GigCardData = {
  slug: string;
  title: string;
  freelancerName: string;
  freelancerSlug: string;
  freelancerAvatarUrl?: string | null;
  sellerLevel?: string;
  isCertified: boolean;
  ratingAvg: number;
  ratingCount: number;
  fromPriceGbp: number;
  categoryName: string;
  gigType?: "CONSULTING" | "TRAINING" | "WORKSHOP";
  sessionStartAt?: string;
  maxSeats?: number;
  seatsBooked?: number;
  coverImageUrl?: string | null;
};

export default function GigCard({ gig }: { gig: GigCardData }) {
  return (
    <Link href={`/gigs/${gig.slug}`} className="card group flex flex-col">
      <div className="aspect-[4/3] bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm relative overflow-hidden">
        {gig.coverImageUrl ? (
          <img src={gig.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          gig.categoryName
        )}
        {gig.gigType && gig.gigType !== "CONSULTING" && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wide bg-neutral-900/80 text-white px-2 py-0.5 rounded">
            {gig.gigType === "WORKSHOP" ? "Workshop" : "Training"}
          </span>
        )}
        <span className="absolute top-2.5 right-2.5 text-base" aria-hidden>
          🤍
        </span>
      </div>
      <div className="p-3.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-neutral-800 text-white text-[10px] font-semibold flex items-center justify-center overflow-hidden">
            {gig.freelancerAvatarUrl ? (
              <img src={gig.freelancerAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              gig.freelancerName.charAt(0)
            )}
          </div>
          <span className="text-[13px] font-semibold text-neutral-900">{gig.freelancerName}</span>
        </div>
        {gig.sellerLevel && <span className="text-[11px] text-neutral-500">{gig.sellerLevel}</span>}
        <p className="text-sm text-neutral-700 line-clamp-2 leading-snug">{gig.title}</p>
        {gig.isCertified && <span className="badge-certified w-fit">✓ Oracle Certified</span>}
        <div className="flex items-center gap-1 text-xs">
          <span className="stars">★★★★★</span>
          <span className="font-bold text-neutral-900">{gig.ratingAvg.toFixed(1)}</span>
          <span className="text-neutral-500">({gig.ratingCount})</span>
        </div>
        <hr className="border-neutral-200 my-1" />
        {gig.gigType === "WORKSHOP" && gig.sessionStartAt ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-brand-700">
              {new Date(gig.sessionStartAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-neutral-500">
                {gig.maxSeats != null ? `${Math.max(gig.maxSeats - (gig.seatsBooked ?? 0), 0)} seats left` : "Seats limited"}
              </span>
              <span className="text-[15px] font-bold text-neutral-900">£{gig.fromPriceGbp}/seat</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-end items-baseline gap-1">
            <span className="text-[11px] uppercase text-neutral-500">From</span>
            <span className="text-[15px] font-bold text-neutral-900">£{gig.fromPriceGbp}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
