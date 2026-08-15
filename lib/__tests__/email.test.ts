import { describe, it, expect } from "vitest";
import { emailTemplates } from "@/lib/email";

describe("emailTemplates", () => {
  it("orderConfirmed includes the gig title and formatted price", () => {
    const result = emailTemplates.orderConfirmed({ gigTitle: "Fusion SCM setup", totalGbp: 450 });
    expect(result.subject).toContain("Fusion SCM setup");
    expect(result.body).toContain("£450.00");
  });

  it("gigApproved includes the gig title", () => {
    const result = emailTemplates.gigApproved({ gigTitle: "OIC integration build" });
    expect(result.subject).toContain("OIC integration build");
    expect(result.subject.toLowerCase()).toContain("live");
  });

  it("gigRejected includes both the gig title and the rejection reason", () => {
    const result = emailTemplates.gigRejected({ gigTitle: "APEX app", reason: "Missing pricing detail" });
    expect(result.subject).toContain("APEX app");
    expect(result.body).toContain("Missing pricing detail");
  });

  it("newMessage includes the sender's name", () => {
    const result = emailTemplates.newMessage({ senderName: "Priya R." });
    expect(result.subject).toContain("Priya R.");
  });

  it("teamOrderRequested includes the team name", () => {
    const result = emailTemplates.teamOrderRequested({ teamName: "Oracle Fusion Team Alpha" });
    expect(result.subject).toContain("Oracle Fusion Team Alpha");
  });
});
