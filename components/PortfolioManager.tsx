"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";

type PortfolioItem = { id: string; title: string; description: string; imageUrl: string | null; videoUrl: string | null; projectUrl: string | null };

export default function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/freelancer/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, imageUrl: imageUrl ?? undefined, videoUrl: videoUrl || undefined, projectUrl: projectUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this item");
        return;
      }
      setTitle("");
      setDescription("");
      setImageUrl(null);
      setVideoUrl("");
      setProjectUrl("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/freelancer/portfolio/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-800 mb-2">Portfolio</h2>
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {items.map((p) => (
            <div key={p.id} className="card p-3">
              <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
              <p className="text-xs text-neutral-500 mb-2">{p.description}</p>
              {p.videoUrl && <p className="text-xs text-brand-700 mb-2">🎬 Video attached</p>}
              <button onClick={() => deleteItem(p.id)} disabled={deletingId === p.id} className="text-xs font-semibold text-red-600 hover:underline">
                {deletingId === p.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addItem} className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-700">Add a project</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input className="input" placeholder="Project title" minLength={2} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input min-h-[70px]" placeholder="What did you build or deliver?" minLength={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input type="url" className="input" placeholder="Project link (optional) — https://..." value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
        {/* FIXED (real gap found during review): portfolio only supported
            a static image — a video embed link (YouTube/Vimeo/Loom) is
            the pragmatic choice real freelance platforms make, rather
            than a full uploaded-video-file pipeline. */}
        <input type="url" className="input" placeholder="Video link — YouTube, Vimeo, Loom (optional) — https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <ImageUpload endpoint="/api/uploads/portfolio" currentUrl={imageUrl} onUploaded={setImageUrl} label="Project image (optional)" />
        <button type="submit" disabled={submitting} className="btn-secondary self-start">
          {submitting ? "Adding..." : "Add project"}
        </button>
      </form>
    </div>
  );
}
