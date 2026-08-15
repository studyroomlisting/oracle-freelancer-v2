"use client";

// Browser-safe only — no next/headers import anywhere in this file,
// deliberately, so Client Components can import this without pulling
// server-only code into the client bundle. See server.ts for why this
// split exists.
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
