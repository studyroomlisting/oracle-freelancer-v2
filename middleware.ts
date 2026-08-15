import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const CSRF_COOKIE_NAME = "og_csrf";

function generateEdgeSafeToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/team-orders", "/messages"];

// FIXED (Supabase Auth migration, CRITICAL): the old middleware checked
// for one hardcoded custom cookie name (`og_session`). Supabase never
// sets that cookie — it manages its own, dynamically-named session
// cookies. Left unfixed, this would have meant EVERY logged-in user
// failing the "does a session cookie exist" check and being redirected
// to login on every protected page, permanently, the instant this
// migration shipped. Caught and fixed as part of this same pass, not
// after the fact.
//
// This also unlocks something the old comment here specifically flagged
// as impossible: real, authoritative session verification in Edge
// Middleware. The old limitation was that `jsonwebtoken` needs Node's
// `crypto` module, unavailable in the Edge Runtime — but Supabase's
// `@supabase/ssr` client validates a session via an HTTP call to
// Supabase's own Auth server, not local JWT crypto, so it works
// correctly here. Middleware now does the FULL check (previously it
// could only ever do a fast-path "cookie present or not" check, with the
// real verification deferred to each page's getServerSession() call) —
// though each page's own getServerSession() call remains in place too,
// both as defense-in-depth and because middleware alone can't check
// role/ownership, only "is there a valid session at all."
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Also refreshes the session's cookies as a side effect when needed —
  // required to keep a long-lived session smoothly alive across
  // navigations, since Supabase's access tokens are short-lived (~1hr)
  // and need periodic refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (!req.cookies.get(CSRF_COOKIE_NAME)) {
    res.cookies.set(CSRF_COOKIE_NAME, generateEdgeSafeToken(24), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: ["/auth/login", "/auth/register", "/dashboard/:path*", "/orders/:path*", "/team-orders/:path*", "/messages/:path*"],
};
