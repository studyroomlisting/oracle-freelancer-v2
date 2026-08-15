import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import WithdrawalForm from "@/components/WithdrawalForm";
import { PAGE_SIZE } from "@/lib/constants";
import { getWalletSummary, calculateAvailableBalance } from "@/lib/wallet";

const typeLabels: Record<string, string> = {
  PAYMENT: "Payment",
  REFUND: "Refund",
  PAYOUT: "Payout",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
};

export default async function PaymentHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Payment history requires a connected database.</p>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = { userId: session.sub };

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const dashboardHref = session.role === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard/client";

  // FIXED (Milestone 12 gap): Wallet/Earnings/Withdrawals didn't exist —
  // only visible to freelancers, since a client doesn't earn or withdraw
  // anything through the platform.
  const wallet = session.role === "FREELANCER" ? await getWalletSummary(session.sub) : null;
  const available = wallet ? calculateAvailableBalance(wallet) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href={dashboardHref} className="text-xs text-neutral-500 hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-6">Payment history</h1>

      {wallet && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-bold text-neutral-900 mb-4">Wallet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xs text-neutral-500">Total earned</p>
              <p className="text-lg font-semibold text-neutral-900">£{wallet.totalEarnedGbp.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Withdrawn</p>
              <p className="text-lg font-semibold text-neutral-900">£{wallet.totalWithdrawnGbp.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Available</p>
              <p className="text-lg font-semibold text-brand-700">£{available.toFixed(2)}</p>
            </div>
          </div>
          <WithdrawalForm availableGbp={available} />
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="card p-6 text-sm text-neutral-500 text-center">No transactions yet.</div>
      ) : (
        <>
          <div className="card divide-y divide-neutral-200">
            {transactions.map((t: any) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{typeLabels[t.type] ?? t.type}</p>
                  <p className="text-xs text-neutral-500">
                    {t.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {t.reference && ` · ${t.reference}`}
                    {t.failureReason && ` · ${t.failureReason}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.status === "FAILED" ? "text-red-600" : "text-neutral-900"}`}>
                    {t.type === "REFUND" || t.type === "WITHDRAWAL" ? "−" : "+"}£{Number(t.amountGbp).toFixed(2)}
                  </p>
                  <span className="badge">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/payments" searchParams={{}} />
        </>
      )}
    </div>
  );
}
