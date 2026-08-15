import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold text-neutral-900 mb-3">404</h1>
      <p className="text-sm text-neutral-600 mb-6">We couldn't find that page.</p>
      <Link href="/" className="btn-primary inline-block">
        Back to homepage
      </Link>
    </div>
  );
}
