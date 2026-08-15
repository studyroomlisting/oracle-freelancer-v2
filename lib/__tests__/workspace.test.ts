import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client entirely — these tests exercise the access-control
// *logic* in lib/workspace.ts, not real database behavior. This is the
// pattern to extend if you want to cover more of the DB-dependent code
// (see the honest scope note in README Phase 15).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    teamOrder: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { canAccessOrderWorkspace, canAccessTeamOrderWorkspace } from "@/lib/workspace";

describe("canAccessOrderWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grants access to the client who placed the order", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await canAccessOrderWorkspace("client-1", "order-1")).toBe(true);
  });

  it("grants access to the freelancer who owns the gig", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await canAccessOrderWorkspace("freelancer-1", "order-1")).toBe(true);
  });

  it("denies access to an unrelated user", async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      clientId: "client-1",
      gig: { freelancerProfile: { userId: "freelancer-1" } },
    });
    expect(await canAccessOrderWorkspace("random-user", "order-1")).toBe(false);
  });

  it("denies access when the order doesn't exist", async () => {
    (prisma.order.findUnique as any).mockResolvedValue(null);
    expect(await canAccessOrderWorkspace("anyone", "missing-order")).toBe(false);
  });
});

describe("canAccessTeamOrderWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  const baseTeamOrder = {
    clientId: "client-1",
    team: {
      teamLeader: { userId: "leader-1" },
      members: [
        { status: "ACTIVE", freelancerProfile: { userId: "member-1" } },
        { status: "REPLACED", freelancerProfile: { userId: "former-member" } },
      ],
    },
  };

  it("grants access to the client", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(baseTeamOrder);
    expect(await canAccessTeamOrderWorkspace("client-1", "to-1")).toBe(true);
  });

  it("grants access to the team leader", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(baseTeamOrder);
    expect(await canAccessTeamOrderWorkspace("leader-1", "to-1")).toBe(true);
  });

  it("grants access to an active member", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(baseTeamOrder);
    expect(await canAccessTeamOrderWorkspace("member-1", "to-1")).toBe(true);
  });

  it("denies access to a replaced (former) member", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(baseTeamOrder);
    expect(await canAccessTeamOrderWorkspace("former-member", "to-1")).toBe(false);
  });

  it("denies access to an unrelated user", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue(baseTeamOrder);
    expect(await canAccessTeamOrderWorkspace("random-user", "to-1")).toBe(false);
  });

  it("only grants client access for custom compositions with no persisted team", async () => {
    (prisma.teamOrder.findUnique as any).mockResolvedValue({ clientId: "client-1", team: null });
    expect(await canAccessTeamOrderWorkspace("client-1", "to-2")).toBe(true);
    expect(await canAccessTeamOrderWorkspace("someone-else", "to-2")).toBe(false);
  });
});
