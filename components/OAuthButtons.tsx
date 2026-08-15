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
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: "google" | "apple") {
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
      setError(error.message || `Couldn't start sign-in with ${provider === "google" ? "Google" : "Apple"}.`);
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
      <button
        type="button"
        onClick={() => signInWith("apple")}
        disabled={loading !== null}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        {loading === "apple" ? "Redirecting..." : "Continue with Apple"}
      </button>
    </div>
  );
}
