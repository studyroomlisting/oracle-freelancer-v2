import { getInbox } from "@/lib/queries";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InboxPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  const conversations = await getInbox(session.sub);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">
          No conversations yet — message a seller from a gig page or freelancer profile to start one.
        </div>
      ) : (
        <div className="card divide-y divide-neutral-200">
          {conversations.map((c) => (
            <Link key={c.partnerId} href={`/messages/${c.partnerId}`} className="p-4 flex items-center justify-between hover:bg-neutral-50">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{c.partnerName}</p>
                  {c.unreadCount > 0 && <span className="badge-certified">{c.unreadCount} new</span>}
                </div>
                <p className="text-xs text-neutral-500 line-clamp-1">{c.lastMessage}</p>
              </div>
              <span className="text-xs text-neutral-400">
                {new Date(c.lastMessageAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
