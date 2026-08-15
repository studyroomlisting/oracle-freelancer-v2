"use client";

import { useState } from "react";

export default function ImageUpload({
  endpoint,
  currentUrl,
  onUploaded,
  label,
}: {
  endpoint: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onUploaded(data.url);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-neutral-800 block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {preview ? (
          <img src={preview} alt="Preview" className="w-16 h-16 rounded object-cover border border-neutral-200" />
        ) : (
          <div className="w-16 h-16 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 text-xs">
            None
          </div>
        )}
        <div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-xs" />
          {uploading && <p className="text-xs text-neutral-500 mt-1">Uploading...</p>}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
