"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit your review");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <div className="card p-4 text-sm text-brand-700 bg-brand-50">Thanks — your review has been posted.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3">
      <p className="text-sm font-bold text-neutral-900">Leave a review</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-amber-500" : "text-neutral-300"}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="input min-h-[90px]"
        placeholder="How did it go?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
        minLength={10}
        maxLength={2000}
      />
      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
