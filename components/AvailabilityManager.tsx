"use client";

import { useState } from "react";
import { DAYS_OF_WEEK } from "@/lib/constants";

type WeeklySlot = { dayOfWeek: number; startMinuteUtc: number; endMinuteUtc: number };
type Exception = { id: string; date: string; isAvailable: boolean; note: string | null };

function minutesToTimeInput(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeInputToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export default function AvailabilityManager({
  initialSlots,
  initialExceptions,
}: {
  initialSlots: WeeklySlot[];
  initialExceptions: Exception[];
}) {
  const [enabledDays, setEnabledDays] = useState<Record<number, boolean>>(
    Object.fromEntries(DAYS_OF_WEEK.map((d) => [d.value, initialSlots.some((s) => s.dayOfWeek === d.value)]))
  );
  const [times, setTimes] = useState<Record<number, { start: string; end: string }>>(
    Object.fromEntries(
      DAYS_OF_WEEK.map((d) => {
        const existing = initialSlots.find((s) => s.dayOfWeek === d.value);
        return [
          d.value,
          { start: minutesToTimeInput(existing?.startMinuteUtc ?? 540), end: minutesToTimeInput(existing?.endMinuteUtc ?? 1020) },
        ];
      })
    )
  );
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [newExceptionDate, setNewExceptionDate] = useState("");
  const [newExceptionNote, setNewExceptionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveWeeklySchedule() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const weeklySlots = DAYS_OF_WEEK.filter((d) => enabledDays[d.value]).map((d) => ({
        dayOfWeek: d.value,
        startMinuteUtc: timeInputToMinutes(times[d.value].start),
        endMinuteUtc: timeInputToMinutes(times[d.value].end),
      }));
      const res = await fetch("/api/freelancer/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklySlots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your schedule");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function addException() {
    if (!newExceptionDate) return;
    setError(null);
    try {
      const res = await fetch("/api/freelancer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newExceptionDate, isAvailable: false, note: newExceptionNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that date");
        return;
      }
      setExceptions((ex) => [...ex, data.exception]);
      setNewExceptionDate("");
      setNewExceptionNote("");
    } catch {
      setError("Network error — please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-1">Weekly availability (UTC)</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Times are stored in UTC to avoid daylight-saving bugs — convert from your local time if needed.
        </p>
        <div className="card divide-y divide-neutral-200">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d.value} className="p-3 flex items-center gap-4">
              <label className="flex items-center gap-2 w-32 shrink-0">
                <input
                  type="checkbox"
                  checked={enabledDays[d.value]}
                  onChange={(e) => setEnabledDays((s) => ({ ...s, [d.value]: e.target.checked }))}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm font-medium text-neutral-800">{d.label}</span>
              </label>
              {enabledDays[d.value] && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input"
                    value={times[d.value].start}
                    onChange={(e) => setTimes((t) => ({ ...t, [d.value]: { ...t[d.value], start: e.target.value } }))}
                  />
                  <span className="text-neutral-400 text-sm">to</span>
                  <input
                    type="time"
                    className="input"
                    value={times[d.value].end}
                    onChange={(e) => setTimes((t) => ({ ...t, [d.value]: { ...t[d.value], end: e.target.value } }))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveWeeklySchedule} disabled={saving} className="btn-primary mt-4">
          {saving ? "Saving..." : "Save weekly schedule"}
        </button>
        {saved && <span className="text-sm text-brand-700 ml-3">Saved.</span>}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-1">Blocked dates</h2>
        <p className="text-xs text-neutral-500 mb-4">Holidays or one-off days you're unavailable, regardless of your weekly schedule.</p>

        <div className="flex gap-2 mb-4">
          <input type="date" className="input" value={newExceptionDate} onChange={(e) => setNewExceptionDate(e.target.value)} />
          <input
            className="input"
            placeholder="Note (optional)"
            value={newExceptionNote}
            onChange={(e) => setNewExceptionNote(e.target.value)}
          />
          <button onClick={addException} className="btn-secondary shrink-0" disabled={!newExceptionDate}>
            Block date
          </button>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-neutral-500">No blocked dates yet.</p>
        ) : (
          <div className="card divide-y divide-neutral-200">
            {exceptions.map((ex) => (
              <div key={ex.id} className="p-3 flex justify-between text-sm">
                <span className="font-medium text-neutral-800">
                  {new Date(ex.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-neutral-500">{ex.note ?? "Unavailable"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
