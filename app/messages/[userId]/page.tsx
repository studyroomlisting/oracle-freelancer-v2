import { getThread } from "@/lib/queries";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageThread from "@/components/MessageThread";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { gigId?: string };
}) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Messaging requires a connected database.</p>
      </div>
    );
  }

  const { partnerName, messages } = await getThread(session.sub, params.userId);
  if (!partnerName) notFound();

  // Gig context comes from the "Contact about this gig" entry point
  // (?gigId=...) or, failing that, whichever gig the most recent message in
  // this thread was already tagged with — so re-opening an old
  // gig-specific conversation still shows the context banner.
  let gigContext: { id: string; slug: string; title: string } | null = null;
  if (searchParams.gigId) {
    const gig = await prisma.gig.findUnique({ where: { id: searchParams.gigId }, select: { id: true, slug: true, title: true } });
    if (gig) gigContext = gig;
  } else {
    const lastTagged = [...messages].reverse().find((m: any) => m.gig);
    if (lastTagged) gigContext = (lastTagged as any).gig;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/messages" className="text-xs text-neutral-500 hover:underline">← All messages</Link>
      <h1 className="text-lg font-semibold text-neutral-900 mt-2 mb-6">{partnerName}</h1>

      <MessageThread
        currentUserId={session.sub}
        receiverId={params.userId}
        initialMessages={messages.map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          readAt: m.readAt ? m.readAt.toISOString() : null,
          createdAt: m.createdAt.toISOString(),
          gig: m.gig,
        }))}
        gigContext={gigContext}
      />
    </div>
  );
}
