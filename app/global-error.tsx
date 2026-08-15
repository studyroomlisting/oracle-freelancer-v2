"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

// global-error.tsx is the one boundary that can catch an error thrown by
// the ROOT layout itself (app/error.tsx cannot — it's rendered inside the
// root layout, so if the layout itself throws, error.tsx never mounts).
// It must render its own <html>/<body> since it replaces the root layout
// entirely when active.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Unhandled root layout error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 480, margin: "96px auto", padding: "0 16px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>
            We've logged the issue. Please refresh the page.
          </p>
          <button
            onClick={reset}
            style={{ background: "#1DBF73", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
