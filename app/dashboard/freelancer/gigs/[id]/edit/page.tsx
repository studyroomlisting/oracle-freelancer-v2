import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CreateGigForm from "@/components/CreateGigForm";
import FaqManager from "@/components/FaqManager";
import ExtrasManager from "@/components/ExtrasManager";
import { getCategories } from "@/lib/queries";

export default async function EditGigPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Editing a gig requires a connected database.</p>
      </div>
    );
  }

  const [gig, categories] = await Promise.all([
    prisma.gig.findUnique({
      where: { id: params.id },
      include: { freelancerProfile: true, packages: { orderBy: { priceGbp: "asc" } }, faqItems: { orderBy: { displayOrder: "asc" } }, extras: { orderBy: { displayOrder: "asc" } } },
    }),
    getCategories(),
  ]);

  if (!gig) notFound();
  if (gig.freelancerProfile.userId !== session.sub) notFound();

  const initialGig = {
    id: gig.id,
    gigType: gig.gigType,
    title: gig.title,
    description: gig.description,
    categoryId: gig.categoryId,
    coverImageUrl: gig.coverImageUrl,
    level: gig.level,
    cancellationWindowHours: gig.cancellationWindowHours,
    latePenaltyPercent: gig.latePenaltyPercent,
    tags: gig.tags,
    packages: gig.packages.map((p: any) => ({
      tier: p.tier,
      title: p.title,
      description: p.description,
      priceGbp: String(p.priceGbp),
      deliveryDays: String(p.deliveryDays),
      revisions: String(p.revisions),
      sessionDurationMinutes: String(p.sessionDurationMinutes ?? 60),
    })),
    workshop:
      gig.gigType === "WORKSHOP"
        ? {
            priceGbp: String(gig.packages[0]?.priceGbp ?? ""),
            sessionStartAt: gig.sessionStartAt ? new Date(gig.sessionStartAt.getTime() - gig.sessionStartAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
            sessionEndAt: gig.sessionEndAt ? new Date(gig.sessionEndAt.getTime() - gig.sessionEndAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
            maxSeats: String(gig.maxSeats ?? ""),
          }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/freelancer" className="text-xs text-neutral-500 hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-6">Edit gig</h1>
      <CreateGigForm categories={categories} initialGig={initialGig as any} />
      <div className="mt-8">
        <FaqManager gigId={gig.id} items={gig.faqItems} />
      </div>
      <div className="mt-8">
        <ExtrasManager
          gigId={gig.id}
          items={gig.extras.map((e: any) => ({ id: e.id, title: e.title, description: e.description, priceGbp: Number(e.priceGbp), extraDeliveryDays: e.extraDeliveryDays }))}
        />
      </div>
    </div>
  );
}
