"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// FIXED (real gap): Google/Apple login didn't exist at all. Works for both
// login AND signup with the same flow — Supabase creates the account
// automatically on first use of a given provider, same as almost every
// real "Continue with Google" button anywhere else works. The redirect
// goes through the same shared /auth/callback route already built for
// email/magic-link flows (Phase 69) — no separate OAuth-specific callback
// needed, since the underlying code-exchange mechanism is identical.
export default function OAuthButtons({ intendedRole }: { intendedRole?: "CLIENT" | "FREELANCER" }) {
  const [loading, setLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: "google") {
    setLoading(provider);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${intendedRole ? `?role=${intendedRole}` : ""}`,
      },
    });
    if (error) {
      setError(error.message || "Couldn't start sign-in with Google.");
      setLoading(null);
    }
    // On success, the browser is redirected away entirely — nothing else
    // to do here.
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => signInWith("google")}
        disabled={loading !== null}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.5 4 24 4 16.1 4 9.3 8.4 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.6 5C9.2 39.6 16 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.4C41.4 35.6 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
        {loading === "google" ? "Redirecting..." : "Continue with Google"}
      </button>
    </div>
  );
}
