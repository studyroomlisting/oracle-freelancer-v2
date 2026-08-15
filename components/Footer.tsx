import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-neutral-500 flex flex-col sm:flex-row justify-between gap-4">
        <p>© {new Date().getFullYear()} OracleGigs. Not affiliated with Oracle Corporation.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-neutral-700">
            About
          </Link>
          <Link href="/pricing" className="hover:text-neutral-700">
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-neutral-700">
            FAQ
          </Link>
          <Link href="/help" className="hover:text-neutral-700">
            Help Centre
          </Link>
          <Link href="/contact" className="hover:text-neutral-700">
            Contact
          </Link>
          <Link href="/terms" className="hover:text-neutral-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-neutral-700">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-neutral-700">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
