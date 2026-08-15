import { getCategories } from "@/lib/queries";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateGigForm from "@/components/CreateGigForm";

// FIXED (Milestone 18 security review): this page had no auth check at
// all — the underlying create route (`POST /api/gigs`) does correctly
// require a freelancer session, so a non-freelancer could never actually
// create a gig, but they could still view this form page, which a client
// browsing to it shouldn't be able to do.
export default async function NewGigPage() {
  const session = await getServerSession();
  if (!session || session.role !== "FREELANCER") redirect("/auth/login");

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Create a gig</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Choose consulting, training, or workshop — pricing and delivery fields adjust automatically.
      </p>
      <CreateGigForm categories={categories} />
    </div>
  );
}
