"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// FIXED (real bug found during review): registering, then clicking
// "Confirm email address," landed on the login page — then logging in
// with the exact right password still failed with "Invalid email or
// password." Root cause: Supabase's default confirmation email routes
// through Supabase's OWN hosted /auth/v1/verify endpoint, which redirects
// back here with the session in the URL's HASH FRAGMENT
// (#access_token=...&refresh_token=...) — not a `?code=` query param.
// A server route (like app/auth/callback/route.ts) can never see a hash
// fragment; browsers never send it to the server at all. That's why the
// old flow silently failed.
//
// The textbook fix is changing the "Confirm signup" email template to
// use `token_hash` in a query param instead (see app/auth/confirm/route.ts
// for that version) — but editing email templates in the Supabase
// dashboard requires custom SMTP to be configured first, which isn't set
// up here yet. This page is the code-only alternative: it runs in the
// BROWSER, where the hash fragment IS visible, reads the tokens out of
// it, and calls supabase.auth.setSession() directly — no template change
// needed. emailRedirectTo (see app/api/auth/register/route.ts) points
// here instead of /auth/callback for exactly this reason.
export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    async function run() {
      // FIXED (real bug found during review): this page originally only
      // checked the URL's hash fragment (#access_token=...), based on
      // Supabase's default hosted-verify redirect behavior. In practice,
      // this project's confirmation links come back with a `?code=...`
      // QUERY param instead (visible in server logs, unlike a hash
      // fragment) — the same PKCE-style code /auth/callback already
      // knows how to exchange for Google sign-in. Rather than duplicate
      // that exchange logic here, just hand off to the already-proven
      // route, preserving every query param (code, type, role, etc.)
      // exactly as received.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        window.location.replace(`/auth/callback${window.location.search}`);
        return;
      }

      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");

      if (!access_token || !refresh_token) {
        setStatus("error");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setStatus("error");
        return;
      }

      const search = new URLSearchParams(window.location.search);
      const query = new URLSearchParams();
      if (type) query.set("type", type);
      const role = search.get("role");
      if (role) query.set("role", role);

      try {
        const res = await fetch(`/api/auth/verify-complete?${query.toString()}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.redirectTo) {
          setStatus("error");
          return;
        }
        router.replace(data.redirectTo);
      } catch {
        setStatus("error");
      }
    }
    run();
  }, [router]);

  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center">
      {status === "working" ? (
        <p className="text-sm text-neutral-600">Confirming your email…</p>
      ) : (
        <>
          <p className="text-sm text-neutral-700 mb-4">
            This confirmation link is invalid or has expired.
          </p>
          <a href="/auth/login" className="btn-secondary">
            Back to login
          </a>
        </>
      )}
    </div>
  );
}
