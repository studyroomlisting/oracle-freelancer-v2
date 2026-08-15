// FIXED (Supabase Auth migration): this page used to receive a `?token=`
// and show a "Sign me in" confirm button that POSTed to
// /api/auth/magic-link/consume — that route and this page's whole
// confirm-step flow are gone. Supabase's own magic-link email now links
// directly to /auth/callback, which signs the user in and redirects them
// automatically the moment it's clicked. This page is no longer reached
// as part of the real flow; it's kept only as a fallback in case an old,
// previously-sent link (from before this migration) is ever clicked.
export default function MagicLinkPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">This link has expired</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Sign-in links are single-use and short-lived. Request a new one from the login page.
      </p>
      <a href="/auth/login" className="btn-primary inline-block">
        Back to login
      </a>
    </div>
  );
}
