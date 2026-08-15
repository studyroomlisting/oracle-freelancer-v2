import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DepositButton from "@/components/DepositButton";
import CancelOrderButton from "@/components/CancelOrderButton";

const statusLabels: Record<string, string> = {
  REQUESTED: "Awaiting deposit",
  DEPOSIT_PAID: "Deposit paid — scoping call next",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function TeamOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">
          Team requests require a connected database — connect <code>DATABASE_URL</code> and try again.
        </p>
      </div>
    );
  }

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: { team: { include: { teamLeader: { include: { user: true } } } }, client: true },
  });

  if (!order) notFound();
  const isClientViewer = order.clientId === session.sub;
  const isLeaderViewer = order.team?.teamLeader.userId === session.sub;
  if (!isClientViewer && !isLeaderViewer && session.role !== "ADMIN") notFound();

  const canCancel = (isClientViewer || isLeaderViewer) && (order.status === "REQUESTED" || order.status === "DEPOSIT_PAID");
  // FIXED (real gap found during review): same missing-message-link gap as
  // the regular order detail page — no way to message the other party
  // directly from an active team engagement.
  const otherPartyUserId = isClientViewer ? order.team?.teamLeader.userId : order.clientId;
  const otherPartyName = isClientViewer ? order.team?.teamLeader.user.fullName : order.client.fullName;

  const composition = order.customComposition as { role: string; consultantName: string; dayRateGbp: number }[] | null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/client" className="text-xs text-neutral-500 hover:underline">← Back to your orders</Link>
      <h1 className="text-xl font-bold text-neutral-900 mt-2 mb-1">
        {order.team ? order.team.name : "Custom Oracle Project Team"}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">Request #{order.id.slice(-8)}</p>

      <div className="card p-5 mb-6 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Status</span>
          <span className="font-semibold text-neutral-900">{statusLabels[order.status] ?? order.status}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Team day rate</span>
          <span className="font-semibold text-neutral-900">£{Number(order.dailyRateGbp).toLocaleString()}/day</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Estimated duration</span>
          <span className="font-semibold text-neutral-900">{order.estimatedWeeks} weeks</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Estimated total</span>
          <span className="font-semibold text-neutral-900">£{Number(order.totalEstimateGbp).toLocaleString()}</span>
        </div>
      </div>

      {composition && (
        <>
          <h2 className="text-sm font-bold text-neutral-900 mb-3">Team composition</h2>
          <div className="card divide-y divide-neutral-200 mb-6">
            {composition.map((c) => (
              <div key={c.role} className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{c.consultantName}</p>
                  <p className="text-xs text-neutral-500">{c.role}</p>
                </div>
                <span className="text-sm font-semibold text-neutral-900">£{c.dayRateGbp}/day</span>
              </div>
            ))}
          </div>
        </>
      )}

      {otherPartyUserId && session.role !== "ADMIN" && (
        <Link href={`/messages/${otherPartyUserId}`} className="btn-secondary inline-flex w-auto px-5 mb-2 mr-2">
          Message {otherPartyName}
        </Link>
      )}
      {order.status === "REQUESTED" && <DepositButton teamOrderId={order.id} />}
      {order.status !== "REQUESTED" && (
        <Link href={`/team-orders/${order.id}/workspace`} className="btn-secondary inline-flex w-auto px-5 mb-2">
          Open project workspace
        </Link>
      )}
      {canCancel && (
        <div className="mt-2">
          {/* FIXED (real gap found during review): this always said "Cancel
              request" regardless of who was looking or when — including a
              team leader seeing a brand-new, unpaid request for the very
              first time, where "Decline" is the honest term. Team orders
              have no separate accept/decline gate the way regular gig
              orders do (there's no TeamOrderStatus for it, and the
              deposit route doesn't check for one) — this doesn't change
              that underlying mechanic, it only makes the existing action
              say what it actually means in each context. */}
          <CancelOrderButton
            basePath={`/api/team-orders/${order.id}`}
            label={isLeaderViewer && order.status === "REQUESTED" ? "Decline request" : "Cancel request"}
          />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <a href={`/api/team-orders/${order.id}/nda`} className="btn-secondary inline-flex w-auto px-5" download>
          Download NDA (PDF)
        </a>
        {order.status !== "REQUESTED" && (
          <a href={`/api/team-orders/${order.id}/sow`} className="btn-secondary inline-flex w-auto px-5" download>
            Download SOW (PDF)
          </a>
        )}
      </div>

      <p className="text-xs text-neutral-500 mt-6">
        This is a request/quote stage — final pricing is confirmed after a short scoping call with the team leader.
        Milestone-based billing for the engagement itself follows the same escrow model as individual gig orders.
      </p>
    </div>
  );
}
