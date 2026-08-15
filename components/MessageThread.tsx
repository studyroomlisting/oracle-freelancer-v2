"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Message = {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  gig: { slug: string; title: string } | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
};

type GigContext = { id: string; slug: string; title: string };

const POLL_INTERVAL_MS = 4000;

function Attachment({ url, type }: { url: string; type: string | null | undefined }) {
  const isImage = type?.startsWith("image/");
  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="Attachment" className="max-w-[220px] rounded-lg mb-1" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs underline mb-1">
      📄 View document
    </a>
  );
}

export default function MessageThread({
  currentUserId,
  receiverId,
  initialMessages,
  gigContext,
}: {
  currentUserId: string;
  receiverId: string;
  initialMessages: Message[];
  gigContext?: GigContext | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(initialMessages.length);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/thread/${receiverId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      // Silent on purpose — a single missed poll isn't worth surfacing an
      // error banner for; the next interval just tries again.
    }
  }, [receiverId]);

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    lastCountRef.current = messages.length;
  }, [messages.length]);

  // FIXED (Milestone 9 gap): no attachment support existed at all.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/message-attachment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't upload that file");
        return;
      }
      setPendingAttachment({ url: data.url, type: data.type });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !pendingAttachment) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          body,
          gigId: gigContext?.id,
          attachmentUrl: pendingAttachment?.url,
          attachmentType: pendingAttachment?.type,
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send that message");
        return;
      }
      setBody("");
      setPendingAttachment(null);
      await poll();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {gigContext && (
        <Link href={`/gigs/${gigContext.slug}`} className="card p-3 mb-4 flex items-center justify-between text-sm hover:bg-neutral-50">
          <span className="text-neutral-600">Re: <span className="font-semibold text-neutral-900">{gigContext.title}</span></span>
          <span className="text-xs text-brand-700">View gig →</span>
        </Link>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              {m.gig && <span className="text-[10px] text-neutral-400 mb-0.5">Re: {m.gig.title}</span>}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-lg text-sm ${isMine ? "bg-brand-500 text-white" : "bg-neutral-100 text-neutral-900"}`}>
                {m.attachmentUrl && <Attachment url={m.attachmentUrl} type={m.attachmentType} />}
                {m.body}
              </div>
              {isMine && <span className="text-[10px] text-neutral-400 mt-0.5">{m.readAt ? "Read" : "Sent"}</span>}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {pendingAttachment && (
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            📎 Attachment ready to send
            <button type="button" onClick={() => setPendingAttachment(null)} className="text-red-600 hover:underline">
              Remove
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="btn-secondary shrink-0 cursor-pointer flex items-center px-3" aria-label="Attach a file">
            {uploading ? "..." : "📎"}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" disabled={uploading} />
          </label>
          <input className="input" placeholder="Write a message..." value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="submit" disabled={sending || uploading || (!body.trim() && !pendingAttachment)} className="btn-primary shrink-0">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </>
  );
}
