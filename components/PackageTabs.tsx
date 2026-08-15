"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Pkg = {
  id: string;
  tier: string;
  title: string;
  description: string;
  priceGbp: number;
  deliveryDays: number;
  revisions: number;
  sessionDurationMinutes?: number | null;
};

type Extra = { id: string; title: string; description: string; priceGbp: number; extraDeliveryDays: number | null };

type Slot = { iso: string; label: string };

export default function PackageTabs({
  packages,
  sellerId,
  freelancerSlug,
  isTraining,
  extras,
}: {
  packages: Pkg[];
  sellerId: string;
  freelancerSlug?: string;
  isTraining?: boolean;
  extras?: Extra[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotIso, setSelectedSlotIso] = useState("");
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const pkg = packages[active];

  function toggleExtra(id: string) {
    setSelectedExtraIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const extrasTotal = (extras ?? []).filter((e) => selectedExtraIds.includes(e.id)).reduce((sum, e) => sum + e.priceGbp, 0);
  const totalPrice = Number(pkg.priceGbp) + extrasTotal;

  useEffect(() => {
    setSelectedSlotIso("");
    setSlots([]);
    if (!isTraining || !freelancerSlug || !selectedDate) return;
    setSlotsLoading(true);
    const duration = pkg.sessionDurationMinutes ?? 60;
    fetch(`/api/freelancers/${freelancerSlug}/available-slots?date=${selectedDate}&duration=${duration}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, isTraining, freelancerSlug, pkg.sessionDurationMinutes]);

  async function handleContinue() {
    if (isTraining && !selectedSlotIso) {
      setError("Please pick an available session time before continuing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigPackageId: pkg.id,
          ...(isTraining ? { scheduledAt: selectedSlotIso } : {}),
          ...(selectedExtraIds.length > 0 ? { extraIds: selectedExtraIds } : {}),
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start checkout");
        return;
      }
      router.push(`/orders/${data.orderId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex border border-neutral-200 rounded-t overflow-hidden">
        {packages.map((p, i) => (
          <button
            key={p.tier}
            onClick={() => setActive(i)}
            className={`flex-1 text-center py-3 text-sm font-bold border-r last:border-r-0 border-neutral-200 ${
              i === active ? "text-neutral-900 border-b-[3px] border-b-brand-500" : "text-neutral-500"
            }`}
          >
            {p.tier.charAt(0) + p.tier.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="border border-t-0 border-neutral-200 rounded-b p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-bold text-neutral-900">{pkg.title}</span>
          <span className="text-xl font-bold text-neutral-900">£{Number(pkg.priceGbp).toFixed(0)}</span>
        </div>
        <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{pkg.description}</p>
        <div className="flex gap-5 text-xs text-neutral-500 mb-5">
          <span>📦 {pkg.deliveryDays}-day delivery</span>
          <span>
            🔁 {pkg.revisions} revision{pkg.revisions > 1 ? "s" : ""}
          </span>
          {isTraining && <span>⏱ {pkg.sessionDurationMinutes ?? 60} min session</span>}
        </div>

        {isTraining && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Pick a date (UTC)</label>
            <input
              type="date"
              className="input mb-2"
              min={todayIso}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {selectedDate && (
              <>
                {slotsLoading ? (
                  <p className="text-xs text-neutral-500">Loading available times...</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-neutral-500">No available slots this day — try another date.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.iso}
                        type="button"
                        onClick={() => setSelectedSlotIso(s.iso)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded border ${
                          selectedSlotIso === s.iso ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-700"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {extras && extras.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-neutral-700 mb-2">Optional extras</p>
            <div className="flex flex-col gap-2">
              {extras.map((e) => (
                <label key={e.id} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selectedExtraIds.includes(e.id)} onChange={() => toggleExtra(e.id)} className="mt-0.5 rounded border-neutral-300" />
                  <span className="flex-1">
                    <span className="font-semibold text-neutral-800">{e.title}</span> — £{e.priceGbp.toFixed(2)}
                    {e.extraDeliveryDays && <span className="text-brand-700"> ({e.extraDeliveryDays}d faster)</span>}
                    <br />
                    <span className="text-neutral-500">{e.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button onClick={handleContinue} disabled={loading} className="btn-primary w-full">
          {loading ? "Starting checkout..." : `Continue (£${totalPrice.toFixed(0)})`}
        </button>
        <Link href={`/messages/${sellerId}`} className="btn-secondary w-full mt-2 text-center">
          Contact seller
        </Link>
      </div>
    </div>
  );
}
