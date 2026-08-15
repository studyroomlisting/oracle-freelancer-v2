import { describe, it, expect } from "vitest";
import { generateCsrfToken, verifyCsrfToken } from "@/lib/auth";

// FIXED (Supabase Auth migration): the JWT-specific tests that used to
// live here (verifySession, isTokenRevoked) tested logic that no longer
// exists — Supabase Auth now owns token issuance/verification/revocation
// entirely. What's left is the CSRF logic, which is unrelated to the auth
// provider and unchanged. The core session-reading logic
// (getServerSession/requireXSession) is now a thin wrapper around
// Supabase's own SDK plus a fresh DB lookup — genuinely not unit-testable
// without a live Supabase project or a mocked SDK, so it isn't tested
// here; that's a real, honest gap, not an oversight (see PROJECT_STATUS.md).
describe("CSRF token helpers", () => {
  it("generates a non-empty hex token", () => {
    const token = generateCsrfToken();
    expect(token.length).toBeGreaterThan(20);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generates different tokens on each call", () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });

  it("verifies matching tokens", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it("rejects mismatched tokens", () => {
    expect(verifyCsrfToken("abc", "def")).toBe(false);
  });

  it("rejects when the form token is missing", () => {
    expect(verifyCsrfToken(null, "def")).toBe(false);
  });

  it("rejects when the cookie token is missing", () => {
    expect(verifyCsrfToken("abc", undefined)).toBe(false);
  });
});
