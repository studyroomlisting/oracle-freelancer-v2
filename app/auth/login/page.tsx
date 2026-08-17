import { cookies } from "next/headers";
import { CSRF_COOKIE_NAME } from "@/lib/auth";
import OAuthButtons from "@/components/OAuthButtons";

export default function LoginPage({ searchParams }: { searchParams: { registered?: string } }) {
  const csrfToken = cookies().get(CSRF_COOKIE_NAME)?.value ?? "";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Log in</h1>

      {searchParams.registered === "1" && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded p-3 mb-5">
          Account created! Check your email for a verification link, then log in below.
        </div>
      )}

      <OAuthButtons />

      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-neutral-200 flex-1" />
        <span className="text-xs text-neutral-400">or</span>
        <div className="h-px bg-neutral-200 flex-1" />
      </div>

      <form className="flex flex-col gap-4" action="/api/auth/login" method="POST">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Password</label>
          <input name="password" type="password" required className="input" />
        </div>
        <div className="flex items-center justify-end">
          <a href="/auth/forgot-password" className="text-sm text-brand-600 hover:underline">
            Forgot password?
          </a>
        </div>
        <button type="submit" className="btn-primary">
          Log in
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <p className="text-sm text-neutral-600 mb-3">New to OracleGigs?</p>
        <a href="/auth/register" className="btn-secondary w-full">
          Create an account
        </a>
      </div>
    </div>
  );
}
