import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EditClientProfileForm from "@/components/EditClientProfileForm";

export default async function ClientProfilePage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  let initial = { companyName: "", companyIndustry: "", companySize: "", avatarUrl: null as string | null };

  if (process.env.DATABASE_URL) {
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (user) {
      initial = {
        companyName: user.companyName ?? "",
        companyIndustry: user.companyIndustry ?? "",
        companySize: user.companySize ?? "",
        avatarUrl: user.avatarUrl,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-1">Company profile</h1>
      <p className="text-sm text-neutral-500 mb-8">Helps freelancers understand who they're working with.</p>
      <EditClientProfileForm initial={initial} />
    </div>
  );
}
