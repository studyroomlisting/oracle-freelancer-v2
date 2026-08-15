// FIXED (Supabase Auth migration): this page used to look up a
// verification token and show a "confirm" button — that entire flow is
// gone. Supabase's own verification email now links directly to
// /auth/callback, which completes the confirmation automatically the
// moment it's clicked; there's no separate confirm step for a user to
// take on this page anymore. What's left is purely informational.
export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-bold text-neutral-900 mb-2">Check your email</h1>
      <p className="text-sm text-neutral-500">
        We've sent a verification link to your email address. Click it to confirm your account — you'll be
        signed in automatically once you do.
      </p>
    </div>
  );
}
