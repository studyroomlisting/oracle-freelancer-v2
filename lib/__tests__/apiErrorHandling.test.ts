import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError, SeatUnavailableError, ScheduleConflictError } from "@/lib/api/errors";

function fakeRequest(path = "/api/test") {
  return { nextUrl: { pathname: path }, method: "POST" } as any;
}

describe("ApiError subclasses", () => {
  it("SeatUnavailableError defaults to 409 with a SEAT_UNAVAILABLE code", () => {
    const err = new SeatUnavailableError();
    expect(err.status).toBe(409);
    expect(err.code).toBe("SEAT_UNAVAILABLE");
  });

  it("ScheduleConflictError defaults to 409 with a SCHEDULE_CONFLICT code", () => {
    const err = new ScheduleConflictError();
    expect(err.status).toBe(409);
    expect(err.code).toBe("SCHEDULE_CONFLICT");
  });

  it("ApiError carries a custom status and code", () => {
    const err = new ApiError("Not found", 404, "NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Not found");
  });
});

describe("withErrorHandling", () => {
  it("passes through a successful response unchanged", async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }, { status: 201 }));
    const res = await handler(fakeRequest(), {});
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("converts a thrown ApiError into its own status/message/code", async () => {
    const handler = withErrorHandling(async () => {
      throw new SeatUnavailableError("Only 2 seats left");
    });
    const res = await handler(fakeRequest(), {});
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Only 2 seats left");
    expect(body.code).toBe("SEAT_UNAVAILABLE");
  });

  it("converts an unexpected error into a generic 500 without leaking internals", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("some internal Prisma connection detail");
    });
    const res = await handler(fakeRequest(), {});
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Something went wrong. Please try again.");
    expect(body.error).not.toContain("Prisma");
  });

  it("still throws for non-Error thrown values without crashing the wrapper", async () => {
    const handler = withErrorHandling(async () => {
      throw "a plain string throw";
    });
    const res = await handler(fakeRequest(), {});
    expect(res.status).toBe(500);
  });
});
