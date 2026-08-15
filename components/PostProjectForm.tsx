"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id?: string; slug: string; name: string };
type Attachment = { url: string; fileType: string; fileName: string };

type InitialProject = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  budgetMinGbp: string;
  budgetMaxGbp: string;
  timelineWeeks: string;
  businessProcess?: string | null;
  subProcess?: string | null;
  oracleVersion?: string | null;
  environment?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  stepsToReproduce?: string | null;
  expectedBehaviour?: string | null;
  actualBehaviour?: string | null;
  priority?: string | null;
  severity?: string | null;
  pricingType?: string | null;
  tags?: string | null;
};

// FIXED (Post Requirement expansion): "Post a project" renamed to "Post
// Requirement" and extended with real Oracle-support-ticket-style detail
// — every new field below is optional, so a simple posting (just title,
// description, budget) still works exactly as before; the extra detail
// is there for whoever wants to give freelancers a much clearer picture
// up front, closer to what a real Oracle SR would capture.
export default function PostProjectForm({ categories, initialProject }: { categories: Category[]; initialProject?: InitialProject }) {
  const router = useRouter();
  const isEditing = !!initialProject;
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialProject?.categoryId ?? categories[0]?.id ?? categories[0]?.slug ?? "");
  const [budgetMinGbp, setBudgetMinGbp] = useState(initialProject?.budgetMinGbp ?? "");
  const [budgetMaxGbp, setBudgetMaxGbp] = useState(initialProject?.budgetMaxGbp ?? "");
  const [timelineWeeks, setTimelineWeeks] = useState(initialProject?.timelineWeeks ?? "");
  const [businessProcess, setBusinessProcess] = useState(initialProject?.businessProcess ?? "");
  const [subProcess, setSubProcess] = useState(initialProject?.subProcess ?? "");
  const [oracleVersion, setOracleVersion] = useState(initialProject?.oracleVersion ?? "");
  const [environment, setEnvironment] = useState(initialProject?.environment ?? "");
  const [errorCode, setErrorCode] = useState(initialProject?.errorCode ?? "");
  const [errorMessage, setErrorMessage] = useState(initialProject?.errorMessage ?? "");
  const [stepsToReproduce, setStepsToReproduce] = useState(initialProject?.stepsToReproduce ?? "");
  const [expectedBehaviour, setExpectedBehaviour] = useState(initialProject?.expectedBehaviour ?? "");
  const [actualBehaviour, setActualBehaviour] = useState(initialProject?.actualBehaviour ?? "");
  const [priority, setPriority] = useState(initialProject?.priority ?? "");
  const [severity, setSeverity] = useState(initialProject?.severity ?? "");
  const [pricingType, setPricingType] = useState(initialProject?.pricingType ?? "");
  const [tags, setTags] = useState(initialProject?.tags ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(isEditing && !!(initialProject?.errorCode || initialProject?.businessProcess));

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/requirement-attachment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't upload that file");
        return;
      }
      setAttachments((list) => [...list, { url: data.url, fileType: data.type, fileName: data.name }]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAttachment(url: string) {
    setAttachments((list) => list.filter((a) => a.url !== url));
  }

  async function handleSubmit(e: React.FormEvent, saveAsDraft = false) {
    e.preventDefault();
    setError(null);
    if (budgetMinGbp && budgetMaxGbp && Number(budgetMinGbp) > Number(budgetMaxGbp)) {
      setError("Minimum budget can't be higher than maximum budget");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        categoryId,
        budgetMinGbp,
        budgetMaxGbp,
        timelineWeeks,
        businessProcess: businessProcess || undefined,
        subProcess: subProcess || undefined,
        oracleVersion: oracleVersion || undefined,
        environment: environment || undefined,
        errorCode: errorCode || undefined,
        errorMessage: errorMessage || undefined,
        stepsToReproduce: stepsToReproduce || undefined,
        expectedBehaviour: expectedBehaviour || undefined,
        actualBehaviour: actualBehaviour || undefined,
        priority: priority || undefined,
        severity: severity || undefined,
        pricingType: pricingType || undefined,
        tags: tags || undefined,
      };
      if (!isEditing) {
        payload.saveAsDraft = saveAsDraft;
        if (attachments.length > 0) payload.attachments = attachments;
      }

      const res = await fetch(isEditing ? `/api/projects/${initialProject!.id}` : "/api/projects", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(isEditing ? "/dashboard/client?updated=1" : `/projects/${data.posting.slug}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Requirement title</label>
        <input className="input" placeholder="Fusion Financials go-live support" minLength={10} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <label className="text-sm font-semibold text-neutral-800 block mb-1">Description</label>
        <textarea className="input min-h-[140px]" minLength={30} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} required />
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Budget min (£)</label>
          <input type="number" min={1} max={10000000} step="0.01" inputMode="decimal" className="input" value={budgetMinGbp} onChange={(e) => setBudgetMinGbp(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Budget max (£)</label>
          <input type="number" min={1} max={10000000} step="0.01" inputMode="decimal" className="input" value={budgetMaxGbp} onChange={(e) => setBudgetMaxGbp(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Timeline (weeks)</label>
          <input type="number" min={1} step={1} inputMode="numeric" className="input" value={timelineWeeks} onChange={(e) => setTimelineWeeks(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Pricing type (optional)</label>
          <select className="input" value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
            <option value="">Not specified</option>
            <option value="FIXED">Fixed price</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Tags (comma-separated, optional)</label>
          <input className="input" placeholder="approvals, bpm, notifications" maxLength={300} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>

      <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-sm font-semibold text-brand-700 text-left hover:underline">
        {showAdvanced ? "− Hide Oracle issue details" : "+ Add Oracle issue details (module/process, environment, error, attachments — optional)"}
      </button>

      {showAdvanced && (
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-neutral-700">Business process classification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Business process, e.g. Purchase Orders" maxLength={200} value={businessProcess} onChange={(e) => setBusinessProcess(e.target.value)} />
            <input className="input" placeholder="Sub process, e.g. Approval Rules" maxLength={200} value={subProcess} onChange={(e) => setSubProcess(e.target.value)} />
          </div>

          <p className="text-xs font-semibold text-neutral-700 mt-2">Environment & version</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
              <option value="">Environment (optional)</option>
              <option value="DEV">DEV</option>
              <option value="TEST">TEST</option>
              <option value="UAT">UAT</option>
              <option value="PROD">PROD</option>
            </select>
            <input className="input" placeholder="Oracle version, e.g. 24C" maxLength={100} value={oracleVersion} onChange={(e) => setOracleVersion(e.target.value)} />
          </div>

          <p className="text-xs font-semibold text-neutral-700 mt-2">Issue details</p>
          <input className="input" placeholder="Error code (optional)" maxLength={100} value={errorCode} onChange={(e) => setErrorCode(e.target.value)} />
          <textarea className="input min-h-[60px]" placeholder="Error message (optional)" maxLength={4000} value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} />
          <textarea className="input min-h-[80px]" placeholder="Steps to reproduce (optional)" maxLength={4000} value={stepsToReproduce} onChange={(e) => setStepsToReproduce(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea className="input min-h-[60px]" placeholder="Expected behaviour" maxLength={2000} value={expectedBehaviour} onChange={(e) => setExpectedBehaviour(e.target.value)} />
            <textarea className="input min-h-[60px]" placeholder="Actual behaviour" maxLength={2000} value={actualBehaviour} onChange={(e) => setActualBehaviour(e.target.value)} />
          </div>

          <p className="text-xs font-semibold text-neutral-700 mt-2">Priority & severity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Priority (optional)</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Severity (optional)</option>
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="CRITICAL">Critical</option>
              <option value="BLOCKER">Blocker</option>
            </select>
          </div>

          {!isEditing && (
            <>
              <p className="text-xs font-semibold text-neutral-700 mt-2">Attachments (screenshots, videos, logs — optional)</p>
              {attachments.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {attachments.map((a) => (
                    <li key={a.url} className="flex items-center justify-between text-xs bg-neutral-50 rounded px-2 py-1">
                      <span className="truncate">{a.fileName}</span>
                      <button type="button" onClick={() => removeAttachment(a.url)} className="text-red-600 hover:underline shrink-0 ml-2">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="btn-secondary self-start cursor-pointer text-sm">
                {uploading ? "Uploading..." : "+ Attach a file"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm,text/plain,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </>
          )}
        </div>
      )}

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
          Your requirement won't be visible to freelancers until an admin approves it — usually within 24 hours.
        </p>
      )}
    </form>
  );
}
