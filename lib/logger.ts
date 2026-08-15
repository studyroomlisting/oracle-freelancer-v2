// Structured logging, currently backed by console but shaped so a real
// provider (Sentry, Pino + a log drain, Axiom, etc.) can be dropped in by
// changing only this file. Added as part of the production-readiness fix
// pass — previously there was no logging infrastructure in the codebase at
// all, meaning production errors were invisible.

type LogContext = Record<string, unknown>;

function serialize(context?: LogContext) {
  if (!context) return "";
  try {
    return " " + JSON.stringify(context, (_key, value) => (value instanceof Error ? { message: value.message, stack: value.stack } : value));
  } catch {
    return "";
  }
}

export const logger = {
  error(message: string, context?: LogContext) {
    // TODO: send to Sentry/error-tracking provider once configured — see
    // the same "swap point" pattern used in lib/email.ts and lib/storage.ts.
    console.error(`[error] ${message}${serialize(context)}`);
  },
  warn(message: string, context?: LogContext) {
    console.warn(`[warn] ${message}${serialize(context)}`);
  },
  info(message: string, context?: LogContext) {
    console.log(`[info] ${message}${serialize(context)}`);
  },
};
