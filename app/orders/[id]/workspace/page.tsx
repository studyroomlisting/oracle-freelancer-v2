import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { canAccessOrderWorkspace, getOrderWorkspaceRole } from "@/lib/workspace";
import ProjectWorkspace from "@/components/ProjectWorkspace";

export default async function OrderWorkspacePage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">The project workspace requires a connected database.</p>
      </div>
    );
  }

  const hasAccess = await canAccessOrderWorkspace(session.sub, params.id);
  if (!hasAccess) notFound();
  const role = await getOrderWorkspaceRole(session.sub, params.id);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, client: true },
  });
  if (!order) notFound();

  const [tasks, notes] = await Promise.all([
    prisma.workspaceTask.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.workspaceNote.findMany({ where: { orderId: params.id }, orderBy: { createdAt: "desc" }, include: { author: true } }),
  ]);

  const participants = [
    { id: order.client.id, name: `${order.client.fullName} (Client)` },
    { id: order.gig.freelancerProfile.user.id, name: `${order.gig.freelancerProfile.user.fullName} (Freelancer)` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href={`/orders/${order.id}`} className="text-xs text-neutral-500 hover:underline">← Back to order</Link>
      <h1 className="text-xl font-bold text-neutral-900 mt-2 mb-1">Project workspace</h1>
      <p className="text-sm text-neutral-500 mb-8">{order.gig.title}</p>
      <ProjectWorkspace
        basePath={`/api/orders/${order.id}`}
        initialTasks={tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status, assignedToUserId: t.assignedToUserId }))}
        initialNotes={notes.map((n: any) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), authorUserId: n.authorUserId, author: { fullName: n.author.fullName } }))}
        role={role}
        currentUserId={session.sub}
        participants={participants}
      />
    </div>
  );
}
