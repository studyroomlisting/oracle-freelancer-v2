import CreateTeamForm from "@/components/CreateTeamForm";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

// FIXED (Milestone 18 security review): same gap as gigs/new — no
// page-level auth check at all, only the underlying create route enforced it.
export default async function NewTeamPage() {
  const session = await getServerSession();
  if (!session || session.role !== "FREELANCER") redirect("/auth/login");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Create a team</h1>
      <p className="text-sm text-neutral-500 mb-8">
        You become the Team Leader. Add other freelancers by their profile slug and role — the team goes live once an
        admin approves it.
      </p>
      <CreateTeamForm />
    </div>
  );
}
