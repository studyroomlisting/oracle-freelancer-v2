import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getOrderWorkspaceRole } from "@/lib/workspace";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PayNowButton from "@/components/PayNowButton";
import MilestoneActions from "@/components/MilestoneActions";
import ReviewForm from "@/components/ReviewForm";
import SellerResponseForm from "@/components/SellerResponseForm";
import CancelOrderButton from "@/components/CancelOrderButton";
import RescheduleButton from "@/components/RescheduleButton";
import AcceptDeclineOrder from "@/components/AcceptDeclineOrder";
import RaiseDisputeButton from "@/components/RaiseDisputeButton";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PENDING_ACCEPTANCE: "Awaiting freelancer acceptance",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  IN_REVISION: "In revision",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export default async function OrderDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { paid?: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">
          Order pages require a connected database — this is a write-path feature with no sample-data preview.
          Connect <code>DATABASE_URL</code> and try checkout again.
        </p>
      </div>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      gig: { include: { category: true, freelancerProfile: { include: { user: true } } } },
      gigPackage: true,
      milestones: true,
      review: true,
      client: true,
    },
  });

  if (!order) notFound();
  const isFreelancerOnOrder = order.gig.freelancerProfile.userId === session.sub;
  if (order.clientId !== session.sub && !isFreelancerOnOrder && session.role !== "ADMIN") notFound();

  const viewerRole = await getOrderWorkspaceRole(session.sub, order.id);
  const isClientViewer = order.clientId === session.sub;
  const canCancel = (isClientViewer || isFreelancerOnOrder) && (order.status === "PENDING_PAYMENT" || order.status === "PENDING_ACCEPTANCE" || order.status === "IN_PROGRESS");
  const awaitingMyAcceptance = isFreelancerOnOrder && order.status === "PENDING_ACCEPTANCE";
  const canDispute = (isClientViewer || isFreelancerOnOrder) && ["IN_PROGRESS", "DELIVERED", "IN_REVISION"].includes(order.status);
  const canReschedule = isClientViewer && order.gig.gigType === "TRAINING" && order.status === "IN_PROGRESS" && order.scheduledAt;
  // FIXED (real gap found during review): there was no way to message the
  // other party directly from an active order — exactly where mid-order
  // communication (questions, clarifications about deliverables) matters
  // most. Reuses the same gig-context conversation pattern already used
  // from the gig page's "Contact about this gig."
  const otherPartyUserId = isClientViewer ? order.gig.freelancerProfile.userId : order.clientId;
  const otherPartyName = isClientViewer ? order.gig.freelancerProfile.user.fullName : order.client.fullName;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      {searchParams.paid === "1" && (
        <div className="mb-6 text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded p-3">
          ✅ Payment successful — {order.gig.freelancerProfile.user.fullName} has been notified and will accept or
          decline shortly.
        </div>
      )}
      <Link href="/dashboard/client" className="text-xs text-neutral-500 hover:underline">← Back to your orders</Link>
      <h1 className="text-xl font-bold text-neutral-900 mt-2 mb-1">{order.gig.title}</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Order #{order.id.slice(-8)} · {order.gig.freelancerProfile.user.fullName}
      </p>

      <div className="card p-5 mb-6 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Status</span>
          <span className="font-semibold text-neutral-900">{statusLabels[order.status] ?? order.status}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Package</span>
          <span className="font-semibold text-neutral-900">{order.gigPackage.title}</span>
        </div>
        {order.scheduledAt && (
          <div className="flex justify-between text-sm items-center">
            <span className="text-neutral-500">Session time</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900">
                {new Date(order.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
              </span>
              {canReschedule && <RescheduleButton orderId={order.id} />}
            </div>
          </div>
        )}
        {Array.isArray(order.extrasSnapshot) && order.extrasSnapshot.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Extras</span>
            <span className="font-semibold text-neutral-900 text-right">
              {(order.extrasSnapshot as { title: string; priceGbp: number }[]).map((e) => (
                <span key={e.title} className="block">{e.title} — £{e.priceGbp.toFixed(2)}</span>
              ))}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-semibold text-neutral-900">£{Number(order.totalPriceGbp).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Service fee (5.5%)</span>
          <span className="text-neutral-600">£{Number(order.clientServiceFeeGbp).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-neutral-200">
          <span className="text-neutral-700 font-semibold">You pay</span>
          <span className="font-bold text-neutral-900">£{(Number(order.totalPriceGbp) + Number(order.clientServiceFeeGbp)).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Platform fee (20%, from freelancer's payout)</span>
          <span className="text-neutral-600">£{Number(order.platformFeeGbp).toFixed(2)}</span>
        </div>
      </div>

      {awaitingMyAcceptance && <AcceptDeclineOrder orderId={order.id} />}

      {order.status === "DISPUTED" && order.disputeReason && (
        <div className="card p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-sm font-semibold text-neutral-900 mb-1">This order is under dispute</p>
          <p className="text-sm text-neutral-700">{order.disputeReason}</p>
          <p className="text-xs text-neutral-500 mt-2">An admin will review and resolve this shortly.</p>
        </div>
      )}
      {order.disputeResolutionNotes && order.status !== "DISPUTED" && (
        <div className="card p-4 mb-6 bg-neutral-50">
          <p className="text-sm font-semibold text-neutral-900 mb-1">Dispute resolution</p>
          <p className="text-sm text-neutral-700">{order.disputeResolutionNotes}</p>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap mb-6">
        {session.role !== "ADMIN" && (
          <Link href={`/messages/${otherPartyUserId}?gigId=${order.gig.id}`} className="btn-secondary inline-flex w-auto px-5">
            Message {otherPartyName}
          </Link>
        )}
        {order.status === "PENDING_PAYMENT" && <PayNowButton orderId={order.id} />}
        {order.status !== "PENDING_PAYMENT" && order.status !== "PENDING_ACCEPTANCE" && (
          <Link href={`/orders/${order.id}/workspace`} className="btn-secondary inline-flex w-auto px-5">
            Open project workspace
          </Link>
        )}
        {canCancel && <CancelOrderButton basePath={`/api/orders/${order.id}`} />}
        {canDispute && <RaiseDisputeButton orderId={order.id} />}
        {order.status !== "PENDING_PAYMENT" && order.status !== "PENDING_ACCEPTANCE" && (
          <>
            <a href={`/api/orders/${order.id}/contract`} className="btn-secondary inline-flex w-auto px-5">
              Download contract
            </a>
            <a href={`/api/orders/${order.id}/invoice`} className="btn-secondary inline-flex w-auto px-5">
              Download invoice
            </a>
          </>
        )}
      </div>

      <h2 className="text-sm font-bold text-neutral-900 mt-8 mb-3">Milestones</h2>
      <div className="card divide-y divide-neutral-200">
        {order.milestones.map((m: any) => (
          <div key={m.id} className="p-4 flex justify-between items-center">
            <span className="text-sm text-neutral-800">{m.title}</span>
            <MilestoneActions
              orderId={order.id}
              milestone={{ id: m.id, title: m.title, amountGbp: Number(m.amountGbp), status: m.status, revisionNote: m.revisionNote }}
              viewerRole={viewerRole}
            />
          </div>
        ))}
      </div>

      {order.status === "COMPLETED" && isClientViewer && !order.review && (
        <div className="mt-8">
          <ReviewForm orderId={order.id} />
        </div>
      )}
      {order.review && (
        <div className="mt-8 card p-5">
          <p className="text-sm font-bold text-neutral-900 mb-1">Your review</p>
          <p className="text-sm text-amber-500 mb-2">{"★".repeat(order.review.rating)}{"☆".repeat(5 - order.review.rating)}</p>
          <p className="text-sm text-neutral-700">{order.review.comment}</p>

          {/* FIXED (real gap found during review): sellers had no way to
              respond to a review at all — a standard feature in every
              real marketplace, completely absent here. */}
          {order.review.sellerResponse ? (
            <div className="mt-4 pl-4 border-l-2 border-neutral-200">
              <p className="text-xs font-bold text-neutral-900 mb-1">Response from {order.gig.freelancerProfile.user.fullName}</p>
              <p className="text-sm text-neutral-700">{order.review.sellerResponse}</p>
            </div>
          ) : (
            isFreelancerOnOrder && <SellerResponseForm orderId={order.id} />
          )}
        </div>
      )}
    </div>
  );
}
