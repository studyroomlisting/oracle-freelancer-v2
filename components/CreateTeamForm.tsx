"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MemberRow = { freelancerSlug: string; roleLabel: string };

export default function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderRoleLabel, setLeaderRoleLabel] = useState("Team Leader — Solution Architect");
  const [dailyRateGbp, setDailyRateGbp] = useState("");
  const [estimatedWeeks, setEstimatedWeeks] = useState("");
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([{ freelancerSlug: "", roleLabel: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateMember(i: number, field: keyof MemberRow, value: string) {
    setMembers((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addMemberRow() {
    setMembers((rows) => [...rows, { freelancerSlug: "", roleLabel: "" }]);
  }

  function removeMemberRow(i: number) {
    setMembers((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const cleanMembers = members.filter((m) => m.freelancerSlug.trim() && m.roleLabel.trim());

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          leaderRoleLabel,
          dailyRateGbp,
          estimatedWeeks,
          availableFromDate,
          members: cleanMembers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setUpgradeRequired(!!data.upgradeRequired);
        return;
      }
      router.push("/dashboard/freelancer?teamCreated=1");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
          {upgradeRequired && (
            <>
              {" "}
              <Link href="/dashboard/freelancer/subscription" className="underline font-semibold">
                Upgrade to Team Pro
              </Link>
            </>
          )}
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Team name</label>
        <input className="input" placeholder="Oracle Finance Implementation Team" minLength={5} maxLength={200} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Description</label>
        <textarea className="input min-h-[100px]" minLength={30} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Your role as Team Leader</label>
        <input className="input" minLength={2} maxLength={200} value={leaderRoleLabel} onChange={(e) => setLeaderRoleLabel(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Team day rate (£)</label>
          <input type="number" min={1} max={100000} step="0.01" inputMode="decimal" className="input" value={dailyRateGbp} onChange={(e) => setDailyRateGbp(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Estimated weeks</label>
          <input type="number" min={1} step={1} inputMode="numeric" className="input" value={estimatedWeeks} onChange={(e) => setEstimatedWeeks(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Available from</label>
          <input type="date" min={new Date().toISOString().slice(0, 10)} className="input" value={availableFromDate} onChange={(e) => setAvailableFromDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-neutral-800">Team members</label>
          <button type="button" onClick={addMemberRow} className="text-xs font-semibold text-brand-700 hover:underline">
            + Add member
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Enter each member's existing freelancer profile slug (visible in their profile URL) and their role on this
          team. They'll appear on the public roster immediately — there's no invite/accept step yet, so only add
          people who've agreed to this.
        </p>
        <div className="flex flex-col gap-2">
          {members.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                placeholder="freelancer-slug (e.g. grace-m)"
                maxLength={200}
                value={m.freelancerSlug}
                onChange={(e) => updateMember(i, "freelancerSlug", e.target.value)}
              />
              <input
                className="input"
                placeholder="Role label (e.g. Finance Functional Consultant)"
                minLength={2}
                maxLength={200}
                value={m.roleLabel}
                onChange={(e) => updateMember(i, "roleLabel", e.target.value)}
              />
              <button type="button" onClick={() => removeMemberRow(i)} className="text-neutral-400 hover:text-red-600 px-2" aria-label="Remove member">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Submitting..." : "Submit for review"}
      </button>
      <p className="text-xs text-neutral-500">
        Your team won't be visible to clients until an admin approves it — usually within 24 hours.
      </p>
    </form>
  );
}
