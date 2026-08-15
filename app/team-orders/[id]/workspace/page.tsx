import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { canAccessTeamOrderWorkspace, getTeamOrderWorkspaceRole } from "@/lib/workspace";
import ProjectWorkspace from "@/components/ProjectWorkspace";

export default async function TeamOrderWorkspacePage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-600">The project workspace requires a connected database.</p>
      </div>
    );
  }

  const hasAccess = await canAccessTeamOrderWorkspace(session.sub, params.id);
  if (!hasAccess) notFound();
  const role = await getTeamOrderWorkspaceRole(session.sub, params.id);

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: {
      team: { include: { teamLeader: { include: { user: true } }, members: { where: { status: "ACTIVE" }, include: { freelancerProfile: { include: { user: true } } } } } },
      client: true,
    },
  });
  if (!order) notFound();

  const [tasks, notes] = await Promise.all([
    prisma.workspaceTask.findMany({ where: { teamOrderId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.workspaceNote.findMany({ where: { teamOrderId: params.id }, orderBy: { createdAt: "desc" }, include: { author: true } }),
  ]);

  const participants = [{ id: order.client.id, name: `${order.client.fullName} (Client)` }];
  if (order.team) {
    participants.push({ id: order.team.teamLeader.user.id, name: `${order.team.teamLeader.user.fullName} (Team Leader)` });
    for (const m of order.team.members) {
      if (m.freelancerProfile.userId !== order.team.teamLeader.userId) {
        participants.push({ id: m.freelancerProfile.user.id, name: `${m.freelancerProfile.user.fullName} (${m.roleLabel})` });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href={`/team-orders/${order.id}`} className="text-xs text-neutral-500 hover:underline">← Back to request</Link>
      <h1 className="text-xl font-bold text-neutral-900 mt-2 mb-1">Project workspace</h1>
      <p className="text-sm text-neutral-500 mb-8">{order.team?.name ?? "Custom Oracle Project Team"}</p>
      <ProjectWorkspace
        basePath={`/api/team-orders/${order.id}`}
        initialTasks={tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status, assignedToUserId: t.assignedToUserId }))}
        initialNotes={notes.map((n: any) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), authorUserId: n.authorUserId, author: { fullName: n.author.fullName } }))}
        role={role}
        currentUserId={session.sub}
        participants={participants}
      />
    </div>
  );
}
