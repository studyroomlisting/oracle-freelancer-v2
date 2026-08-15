import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PostProjectForm from "@/components/PostProjectForm";
import { getCategories } from "@/lib/queries";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Editing a project requires a connected database.</p>
      </div>
    );
  }

  const [posting, categories] = await Promise.all([
    prisma.projectPosting.findUnique({ where: { id: params.id } }),
    getCategories(),
  ]);

  if (!posting) notFound();
  if (posting.clientId !== session.sub) notFound();

  const initialProject = {
    id: posting.id,
    title: posting.title,
    description: posting.description,
    categoryId: posting.categoryId,
    budgetMinGbp: posting.budgetMinGbp ? String(posting.budgetMinGbp) : "",
    budgetMaxGbp: posting.budgetMaxGbp ? String(posting.budgetMaxGbp) : "",
    timelineWeeks: posting.timelineWeeks ? String(posting.timelineWeeks) : "",
    businessProcess: posting.businessProcess,
    subProcess: posting.subProcess,
    oracleVersion: posting.oracleVersion,
    environment: posting.environment,
    errorCode: posting.errorCode,
    errorMessage: posting.errorMessage,
    stepsToReproduce: posting.stepsToReproduce,
    expectedBehaviour: posting.expectedBehaviour,
    actualBehaviour: posting.actualBehaviour,
    priority: posting.priority,
    severity: posting.severity,
    pricingType: posting.pricingType,
    tags: posting.tags,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/dashboard/client" className="text-xs text-neutral-500 hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-semibold text-neutral-900 mt-2 mb-6">Edit Requirement</h1>
      <PostProjectForm categories={categories} initialProject={initialProject} />
    </div>
  );
}
