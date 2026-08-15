import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChangePasswordForm from "@/components/ChangePasswordForm";

// FIXED (real gap found during review): no dedicated settings page
// existed at all, and specifically no way for a logged-in user to
// change their password — only the logged-out "forgot password" recovery
// flow worked. Available to every role, since account settings aren't
// role-specific the way dashboards are.
export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">Settings require a connected database.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Settings</h1>

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">Account</h2>
        <p className="text-sm text-neutral-500">Email</p>
        <p className="text-sm text-neutral-900 mb-1">{user.email}</p>
        <p className="text-xs text-neutral-400">Email address is managed through your login provider and can't be changed here.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
