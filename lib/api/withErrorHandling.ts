import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./errors";
import { logger } from "@/lib/logger";

// Wraps a route handler so that:
// 1. Any ApiError thrown deliberately by business logic returns its own
//    status/message/code as a proper JSON response.
// 2. Any *unexpected* error (a Prisma error, a network failure, a bug) is
//    logged with request context and returns a generic, safe 500 — instead
//    of an unhandled rejection that Next.js turns into a non-JSON default
//    error page (which breaks every client-side `res.json()` call that
//    assumes a JSON error shape).
//
// This existed nowhere in the codebase before the production-readiness
// review — every route previously had zero error handling.
type RouteHandler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;

export function withErrorHandling<Ctx = { params: Record<string, string> }>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        // Expected/business errors are still worth a lower-severity log for
        // visibility (e.g. spikes in 409s might mean a UI bug), but they are
        // not bugs in themselves.
        logger.warn("API business error", { path: req.nextUrl.pathname, status: err.status, message: err.message });
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      logger.error("Unhandled API error", { path: req.nextUrl.pathname, method: req.method, err });
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
