export default function EmailVerificationBanner({ isVerified }: { isVerified: boolean }) {
  if (isVerified) return null;
  return (
    <div className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
      Please verify your email — check your inbox for a link, or it may be in your spam folder.
    </div>
  );
}
