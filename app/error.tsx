"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

// FIXED (production review, High): no error.tsx existed anywhere in the app
// tree before this. Without one, any unhandled error in a Server Component
// bubbles all the way up to Next.js's generic, unstyled default error page —
// in production, for paying customers. This catches errors anywhere in the
// app that isn't covered by a more specific error.tsx.
export default function GlobalErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Unhandled page error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-bold text-neutral-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-neutral-600 mb-6">
        We've logged the issue. Please try again — if it keeps happening, let us know what you were doing.
      </p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
