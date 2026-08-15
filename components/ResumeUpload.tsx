"use client";

import { useState } from "react";

export default function ResumeUpload({
  currentUrl,
  onUploaded,
}: {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setFileUrl(data.url);
      onUploaded(data.url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-neutral-800 block mb-1">Resume / CV (optional, PDF only)</label>
      <div className="flex items-center gap-3">
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
            View current resume
          </a>
        ) : (
          <span className="text-xs text-neutral-400">No resume uploaded</span>
        )}
      </div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} className="text-xs mt-1" />
      {uploading && <p className="text-xs text-neutral-500 mt-1">Uploading...</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
