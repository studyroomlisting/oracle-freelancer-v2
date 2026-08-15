import { NextResponse } from "next/server";

// A "known" business error — thrown deliberately by route/service logic when
// something the caller did is invalid (not available, conflict, forbidden,
// etc.). Anything that isn't one of these is treated as unexpected and
// logged as a genuine bug (see withErrorHandling.ts).
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class SeatUnavailableError extends ApiError {
  constructor(message = "No seats available") {
    super(message, 409, "SEAT_UNAVAILABLE");
  }
}

export class ScheduleConflictError extends ApiError {
  constructor(message = "This time isn't available") {
    super(message, 409, "SCHEDULE_CONFLICT");
  }
}

// Consistent shape for every error response in the app — { error, code? }.
// Client code should read `.error` for display and may optionally branch on
// `.code` for programmatic handling (e.g. redirect-to-login on a specific code).
export type ApiErrorResponse = { error: string; code?: string };

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, code }, { status });
}
