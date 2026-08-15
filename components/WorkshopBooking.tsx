"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WorkshopBooking({
  gigPackageId,
  priceGbp,
  seatsLeft,
  maxSeats,
  sellerId,
}: {
  gigPackageId: string;
  priceGbp: number;
  seatsLeft: number;
  maxSeats: number;
  sellerId: string;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soldOut = seatsLeft <= 0;

  async function handleBook() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigPackageId, seats }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't book this workshop");
        return;
      }
      router.push(`/orders/${data.orderId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-bold text-neutral-900">Book your seat</span>
        <span className="text-xl font-bold text-neutral-900">£{priceGbp}</span>
      </div>
      <p className={`text-xs mb-4 ${seatsLeft <= 5 && !soldOut ? "text-red-600 font-semibold" : "text-neutral-500"}`}>
        {soldOut ? "Sold out" : `${seatsLeft} of ${maxSeats} seats left`}
      </p>

      {!soldOut && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-neutral-700">Seats</label>
          <div className="flex items-center border border-neutral-200 rounded">
            <button
              type="button"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
              aria-label="Decrease seats"
            >
              −
            </button>
            <span className="px-4 text-sm font-semibold">{seats}</span>
            <button
              type="button"
              onClick={() => setSeats((s) => Math.min(seatsLeft, s + 1))}
              className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
              aria-label="Increase seats"
            >
              +
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button onClick={handleBook} disabled={soldOut || loading} className="btn-primary w-full">
        {soldOut ? "Sold out" : loading ? "Booking..." : `Book ${seats} seat${seats > 1 ? "s" : ""} (£${priceGbp * seats})`}
      </button>
      <Link href={`/messages/${sellerId}`} className="btn-secondary w-full mt-2 text-center">
        Contact organiser
      </Link>
    </div>
  );
}
