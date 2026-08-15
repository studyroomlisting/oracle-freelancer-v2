import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-allow-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks requests beyond the limit within the window", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;
    rateLimit(keyA, 1, 60_000);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `test-reset-${Date.now()}`;
    rateLimit(key, 1, 50); // 50ms window
    expect(rateLimit(key, 1, 50).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit(key, 1, 50).allowed).toBe(true);
  });
});
