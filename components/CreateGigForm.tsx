"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COURSE_LEVELS, DEFAULT_CANCELLATION_WINDOW_HOURS, DEFAULT_LATE_PENALTY_PERCENT } from "@/lib/constants";
import ImageUpload from "@/components/ImageUpload";

type Category = { id?: string; slug: string; name: string };

type PackageRow = {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title: string;
  description: string;
  priceGbp: string;
  deliveryDays: string;
  revisions: string;
  sessionDurationMinutes: string;
};

const defaultPackages: PackageRow[] = [
  { tier: "BASIC", title: "Basic", description: "", priceGbp: "", deliveryDays: "5", revisions: "1", sessionDurationMinutes: "60" },
  { tier: "STANDARD", title: "Standard", description: "", priceGbp: "", deliveryDays: "7", revisions: "2", sessionDurationMinutes: "60" },
  { tier: "PREMIUM", title: "Premium", description: "", priceGbp: "", deliveryDays: "10", revisions: "3", sessionDurationMinutes: "60" },
];

type InitialGig = {
  id: string;
  gigType: "CONSULTING" | "TRAINING" | "WORKSHOP";
  title: string;
  description: string;
  categoryId: string;
  coverImageUrl: string | null;
  level: string | null;
  cancellationWindowHours: number | null;
  latePenaltyPercent: number | null;
  tags: string | null;
  packages: PackageRow[];
  workshop?: { priceGbp: string; sessionStartAt: string; sessionEndAt: string; maxSeats: string };
};

export default function CreateGigForm({ categories, initialGig }: { categories: Category[]; initialGig?: InitialGig }) {
  const isEditing = !!initialGig;
  const router = useRouter();
  const [gigType, setGigTypeForCreate] = useState<"CONSULTING" | "TRAINING" | "WORKSHOP">(initialGig?.gigType ?? "CONSULTING");
  const [title, setTitle] = useState(initialGig?.title ?? "");
  const [description, setDescription] = useState(initialGig?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialGig?.categoryId ?? categories[0]?.id ?? categories[0]?.slug ?? "");
  const [packages, setPackages] = useState<PackageRow[]>(initialGig?.packages ?? defaultPackages);
  const [workshop, setWorkshop] = useState(initialGig?.workshop ?? { priceGbp: "", sessionStartAt: "", sessionEndAt: "", maxSeats: "" });
  const [level, setLevel] = useState<string>(initialGig?.level ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initialGig?.coverImageUrl ?? null);
  const [tags, setTags] = useState(initialGig?.tags ?? "");
  const [useCustomCancellation, setUseCustomCancellation] = useState(!!initialGig?.cancellationWindowHours);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(String(initialGig?.cancellationWindowHours ?? DEFAULT_CANCELLATION_WINDOW_HOURS));
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(String(initialGig?.latePenaltyPercent ?? DEFAULT_LATE_PENALTY_PERCENT));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updatePackage(i: number, field: keyof PackageRow, value: string) {
    setPackages((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent, saveAsDraft = false) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: any = { title, description, categoryId, gigType, tags: tags || undefined };
    if (!isEditing) payload.saveAsDraft = saveAsDraft;
    if (coverImageUrl) payload.coverImageUrl = coverImageUrl;
    if (gigType !== "CONSULTING" && level) payload.level = level;
    if (useCustomCancellation) {
      payload.cancellationWindowHours = cancellationWindowHours;
      payload.latePenaltyPercent = latePenaltyPercent;
    }
    if (gigType === "WORKSHOP") {
      Object.assign(payload, workshop);
    } else {
      payload.packages = packages.map((p) => ({ ...p }));
    }

    try {
      const res = await fetch(isEditing ? `/api/gigs/${initialGig!.id}` : "/api/gigs", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(isEditing ? "/dashboard/freelancer?updated=1" : "/dashboard/freelancer?created=1");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Gig type</label>
        {isEditing ? (
          <p className="text-sm text-neutral-600">
            {gigType === "CONSULTING" ? "Consulting" : gigType === "TRAINING" ? "Training" : "Workshop"}{" "}
            <span className="text-xs text-neutral-400">(can't be changed after creation)</span>
          </p>
        ) : (
          <div className="flex gap-2">
            {(["CONSULTING", "TRAINING", "WORKSHOP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setGigTypeForCreate(t)}
                className={`px-4 py-2 rounded text-sm font-semibold border ${
                  gigType === t ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-700"
                }`}
              >
                {t === "CONSULTING" ? "Consulting" : t === "TRAINING" ? "Training" : "Workshop"}
              </button>
            ))}
          </div>
        )}
      </div>

      <ImageUpload endpoint="/api/uploads/gig-cover" onUploaded={setCoverImageUrl} label="Cover image (optional)" />

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Title</label>
        <input
          className="input"
          placeholder="I will configure Oracle Fusion SCM inventory..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Description</label>
        <textarea
          className="input min-h-[120px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Category / module</label>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.slug} value={c.id ?? c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {gigType !== "CONSULTING" && (
        <div>
          <label className="text-sm font-semibold text-neutral-800 block mb-1">Level (optional)</label>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Not specified</option>
            {COURSE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0) + l.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card p-4">
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={useCustomCancellation}
            onChange={(e) => setUseCustomCancellation(e.target.checked)}
            className="rounded border-neutral-300"
          />
          <span className="text-sm font-semibold text-neutral-800">Set a custom cancellation policy</span>
        </label>
        <p className="text-xs text-neutral-500 mb-3">
          Leave unchecked to use the platform default ({DEFAULT_CANCELLATION_WINDOW_HOURS}h free cancellation window,{" "}
          {DEFAULT_LATE_PENALTY_PERCENT}% penalty inside that window).
        </p>
        {useCustomCancellation && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Free cancellation window (hours)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={cancellationWindowHours}
                onChange={(e) => setCancellationWindowHours(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Late cancellation penalty (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={latePenaltyPercent}
                onChange={(e) => setLatePenaltyPercent(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {gigType === "WORKSHOP" ? (
        <div className="card p-4 flex flex-col gap-4">
          <p className="text-sm font-semibold text-neutral-800">Workshop schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Starts at</label>
              <input
                type="datetime-local"
                className="input"
                value={workshop.sessionStartAt}
                onChange={(e) => setWorkshop((w) => ({ ...w, sessionStartAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Ends at</label>
              <input
                type="datetime-local"
                className="input"
                value={workshop.sessionEndAt}
                onChange={(e) => setWorkshop((w) => ({ ...w, sessionEndAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Max seats</label>
              <input
                type="number"
                min={1}
                className="input"
                value={workshop.maxSeats}
                onChange={(e) => setWorkshop((w) => ({ ...w, maxSeats: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-600 block mb-1">Price per seat (£)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={workshop.priceGbp}
                onChange={(e) => setWorkshop((w) => ({ ...w, priceGbp: e.target.value }))}
                required
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-neutral-800">Packages</p>
          {packages.map((p, i) => (
            <div key={p.tier} className="card p-4">
              <p className="text-xs font-bold uppercase text-neutral-500 mb-2">{p.tier}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  className="input"
                  placeholder="Package title"
                  value={p.title}
                  onChange={(e) => updatePackage(i, "title", e.target.value)}
                  required
                />
                <input
                  type="number"
                  min={1}
                  className="input"
                  placeholder="Price (£)"
                  value={p.priceGbp}
                  onChange={(e) => updatePackage(i, "priceGbp", e.target.value)}
                  required
                />
                <input
                  type="number"
                  min={1}
                  className="input"
                  placeholder="Delivery days"
                  value={p.deliveryDays}
                  onChange={(e) => updatePackage(i, "deliveryDays", e.target.value)}
                  required
                />
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="Revisions"
                  value={p.revisions}
                  onChange={(e) => updatePackage(i, "revisions", e.target.value)}
                  required
                />
                {gigType === "TRAINING" && (
                  <input
                    type="number"
                    min={15}
                    step={15}
                    className="input"
                    placeholder="Session length (minutes)"
                    value={p.sessionDurationMinutes}
                    onChange={(e) => updatePackage(i, "sessionDurationMinutes", e.target.value)}
                    required
                  />
                )}
              </div>
              <textarea
                className="input"
                placeholder="What's included at this tier?"
                value={p.description}
                onChange={(e) => updatePackage(i, "description", e.target.value)}
                required
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Tags (comma-separated, optional)</label>
        <input className="input" placeholder="fusion, migration, go-live" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary self-start">
          {submitting ? "Saving..." : isEditing ? "Save changes" : "Submit for review"}
        </button>
        {!isEditing && (
          <button type="button" disabled={submitting} className="btn-secondary self-start" onClick={(e) => handleSubmit(e as any, true)}>
            Save as draft
          </button>
        )}
      </div>
      {!isEditing && (
        <p className="text-xs text-neutral-500">
          Your gig won't be visible to clients until an admin approves it — usually within 24 hours.
        </p>
      )}
    </form>
  );
}
