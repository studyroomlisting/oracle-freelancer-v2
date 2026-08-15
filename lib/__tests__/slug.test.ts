import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("lowercases and hyphenates the title", () => {
    expect(generateSlug("Fusion Financials Go-Live Support", "abc")).toBe("fusion-financials-go-live-support-abc");
  });

  it("strips non-alphanumeric characters", () => {
    expect(generateSlug("SCM: Inventory & Procurement!", "xyz")).toBe("scm-inventory-procurement-xyz");
  });

  it("trims leading/trailing hyphens from the base", () => {
    expect(generateSlug("  Leading and trailing  ", "1")).toBe("leading-and-trailing-1");
  });

  it("uses a timestamp-based suffix by default, producing a consistent shape", () => {
    const a = generateSlug("Same Title");
    expect(a.startsWith("same-title-")).toBe(true);
  });
});
