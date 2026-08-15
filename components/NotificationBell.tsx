"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_INTERVAL_MS = 15000;
const typeIcons: Record<string, string> = {
  order: "📦",
  payment: "💷",
  message: "💬",
  dispute: "⚠️",
  milestone: "✅",
  wallet: "🏦",
  gig: "🛠️",
  team: "👥",
  project: "📋",
  certification: "🎓",
  subscription: "⭐",
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pollCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count);
    } catch {
      // Silent — same non-critical polling philosophy as chat.
    }
  }, []);

  useEffect(() => {
    pollCount();
    const interval = setInterval(pollCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const res = await fetch("/api/notifications?limit=8");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
          setLoaded(true);
        }
      } catch {
        // Leave the dropdown showing "nothing yet" rather than break the UI.
      }
    }
  }

  async function handleClickNotification(n: Notification) {
    if (!n.readAt) {
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    setOpen(false);
    if (n.linkUrl) router.push(n.linkUrl);
  }

  async function markAllRead() {
    setNotifications((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Non-critical — worst case the count corrects itself on the next poll.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button onClick={toggleOpen} className="relative text-lg" aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={`w-full text-left p-3 border-b border-neutral-100 hover:bg-neutral-50 flex gap-2 ${!n.readAt ? "bg-brand-50" : ""}`}
              >
                <span>{typeIcons[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900">{n.title}</p>
                  <p className="text-xs text-neutral-600 line-clamp-2">{n.body}</p>
                </div>
              </button>
            ))
          )}
          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block text-center text-xs text-brand-700 p-3 hover:underline">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
