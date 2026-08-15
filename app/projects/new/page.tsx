import { getCategories } from "@/lib/queries";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PostProjectForm from "@/components/PostProjectForm";

// FIXED (Milestone 18 security review): no page-level auth check existed
// at all. Matches the real rule already enforced by the underlying route
// (`requireAnySession` — any authenticated role can post a project, not
// client-only; a freelancer might post one to subcontract work) rather
// than guessing a stricter rule than what actually exists.
export default async function NewProjectPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Post Requirement</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Freelancers will submit proposals — you review and pick the one that fits.
      </p>
      <PostProjectForm categories={categories} />
    </div>
  );
}
