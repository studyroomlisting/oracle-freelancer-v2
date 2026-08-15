import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SubscriptionManager from "@/components/SubscriptionManager";

export default async function SubscriptionPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let isActive = false;
  let currentPeriodEnd: string | null = null;

  if (process.env.DATABASE_URL) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.sub },
      include: { subscription: true },
    });
    if (profile?.subscription) {
      isActive = profile.subscription.status === "ACTIVE";
      currentPeriodEnd = profile.subscription.currentPeriodEnd.toISOString();
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Subscription</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Free accounts can lead 1 team. Oracle Team Pro removes that limit.
      </p>
      <SubscriptionManager isActive={isActive} currentPeriodEnd={currentPeriodEnd} />
    </div>
  );
}
