import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    teamOrder: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getOrderWorkspaceRole, getTeamOrderWorkspaceRole } from "@/lib/workspace";

describe("getOrderWorkspaceRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("identifies the client", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await getOrderWorkspaceRole("client-1", "order-1")).toBe("client");
  });

  it("identifies the provider (freelancer)", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await getOrderWorkspaceRole("freelancer-1", "order-1")).toBe("provider");
  });

  it("returns null for an unrelated user", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await getOrderWorkspaceRole("random", "order-1")).toBe(null);
  });
});

describe("getTeamOrderWorkspaceRole", () => {
  beforeEach(() => vi.clearAllMocks());

  const teamOrder = {
    clientId: "client-1",
    team: {
      teamLeader: { userId: "leader-1" },
      members: [
        { status: "ACTIVE", freelancerProfile: { userId: "member-1" } },
        { status: "REPLACED", freelancerProfile: { userId: "former-member" } },
      ],
    },
  };

  it("identifies the client", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(teamOrder);
    expect(await getTeamOrderWorkspaceRole("client-1", "to-1")).toBe("client");
  });

  it("identifies the team leader as provider", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(teamOrder);
    expect(await getTeamOrderWorkspaceRole("leader-1", "to-1")).toBe("provider");
  });

  it("identifies an active member as provider", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(teamOrder);
    expect(await getTeamOrderWorkspaceRole("member-1", "to-1")).toBe("provider");
  });

  it("does not treat a replaced member as provider", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(teamOrder);
    expect(await getTeamOrderWorkspaceRole("former-member", "to-1")).toBe(null);
  });
});
