"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FaqItem = { id: string; question: string; answer: string };

export default function FaqManager({ gigId, items }: { gigId: string; items: FaqItem[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${gigId}/faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add this FAQ");
        return;
      }
      setQuestion("");
      setAnswer("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/gigs/${gigId}/faq/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-800 mb-2">FAQ</h2>
      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{item.question}</p>
                  <p className="text-sm text-neutral-600">{item.answer}</p>
                </div>
                <button onClick={() => deleteItem(item.id)} disabled={deletingId === item.id} className="text-xs font-semibold text-red-600 hover:underline shrink-0">
                  {deletingId === item.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addItem} className="card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-700">Add a question</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input className="input" placeholder="Question" minLength={5} maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <textarea className="input min-h-[70px]" placeholder="Answer" minLength={5} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} required />
        <button type="submit" disabled={submitting} className="btn-secondary self-start">
          {submitting ? "Adding..." : "Add FAQ"}
        </button>
      </form>
    </div>
  );
}
