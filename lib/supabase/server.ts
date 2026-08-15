// FIXED (real bug, caught by the build check): this used to live in one
// file together with the browser client — but that file had a top-level
// `next/headers` import (server-only), and once a Client Component
// (OAuthButtons.tsx) needed to import the browser client from the same
// file, the bundler tried to pull next/headers into the client bundle
// too, which fails outright. Splitting into server.ts/client.ts is
// Supabase's own standard, documented pattern for exactly this reason —
// not something invented for this app.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies directly — this is only
          // ever hit when called from one, and middleware.ts is what
          // actually refreshes the session cookie in that case. Safe to
          // ignore here, same guidance Supabase's own docs give for this
          // exact pattern.
        }
      },
    },
  });
}

// Service-role client — bypasses Row Level Security entirely. Only ever
// constructed inside server-only route handlers that genuinely need
// Supabase's Admin API (e.g. POST /api/admin/users). Never imported into
// anything that could run in the browser.
export function createServiceRoleSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
