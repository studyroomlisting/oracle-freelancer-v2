import { prisma } from "@/lib/prisma";

export type WorkspaceRole = "client" | "provider" | null;

// Basic RBAC: distinguishes who is the paying client vs who is delivering
// the work ("provider" — the freelancer on a gig order, or the team leader/
// active member on a team order). Used to restrict which status transitions
// each side can make on a workspace task: the provider marks work as Done;
// the client can reopen a task (send it back) but not close it themselves.
// This is intentionally simple — a real governance model would have more
// granular permissions (who can delete notes, assign tasks, etc.) — but it's
// a real behavioral difference between roles, not just a label.
export async function getOrderWorkspaceRole(userId: string, orderId: string): Promise<WorkspaceRole> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { gig: { include: { freelancerProfile: true } } },
  });
  if (!order) return null;
  if (order.clientId === userId) return "client";
  if (order.gig.freelancerProfile.userId === userId) return "provider";
  return null;
}

export async function getTeamOrderWorkspaceRole(userId: string, teamOrderId: string): Promise<WorkspaceRole> {
  const order = await prisma.teamOrder.findUnique({
    where: { id: teamOrderId },
    include: { team: { include: { teamLeader: true, members: { include: { freelancerProfile: true } } } } },
  });
  if (!order) return null;
  if (order.clientId === userId) return "client";
  if (!order.team) return null;
  if (order.team.teamLeader.userId === userId) return "provider";
  if (order.team.members.some((m: any) => m.status === "ACTIVE" && m.freelancerProfile.userId === userId)) return "provider";
  return null;
}

// Who can see/edit a gig Order's workspace: the client who ordered it, or
// the freelancer who owns the gig being delivered.
export async function canAccessOrderWorkspace(userId: string, orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { gig: { include: { freelancerProfile: true } } },
  });
  if (!order) return false;
  return order.clientId === userId || order.gig.freelancerProfile.userId === userId;
}

// Who can see/edit a TeamOrder's workspace: the client, the team leader, or
// any active team member (for pre-built teams). Custom/AI-recommended
// compositions (teamId null) only grant the client access for now, since
// there's no persisted FreelancerProfile link to check against — the
// consultants named in customComposition haven't necessarily created
// accounts yet.
export async function canAccessTeamOrderWorkspace(userId: string, teamOrderId: string): Promise<boolean> {
  const order = await prisma.teamOrder.findUnique({
    where: { id: teamOrderId },
    include: { team: { include: { teamLeader: true, members: { include: { freelancerProfile: true } } } } },
  });
  if (!order) return false;
  if (order.clientId === userId) return true;
  if (!order.team) return false;
  if (order.team.teamLeader.userId === userId) return true;
  return order.team.members.some((m: any) => m.status === "ACTIVE" && m.freelancerProfile.userId === userId);
}
