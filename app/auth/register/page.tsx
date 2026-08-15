import { cookies } from "next/headers";
import { CSRF_COOKIE_NAME } from "@/lib/auth";
import RegisterOAuthSection from "@/components/RegisterOAuthSection";

export default function RegisterPage() {
  const csrfToken = cookies().get(CSRF_COOKIE_NAME)?.value ?? "";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">Create your account</h1>

      <RegisterOAuthSection />

      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-neutral-200 flex-1" />
        <span className="text-xs text-neutral-400">or</span>
        <div className="h-px bg-neutral-200 flex-1" />
      </div>

      <form className="flex flex-col gap-4" action="/api/auth/register" method="POST">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Full name</label>
          <input name="fullName" required minLength={2} maxLength={100} className="input" />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Email</label>
          <input name="email" type="email" required maxLength={254} className="input" />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">Password</label>
          <input name="password" type="password" minLength={8} maxLength={72} required className="input" />
        </div>
        <div>
          <label className="text-sm text-neutral-700 block mb-1">I am joining as</label>
          <select name="role" className="input">
            <option value="CLIENT">A client hiring Oracle consultants</option>
            <option value="FREELANCER">An Oracle freelancer offering gigs</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Create account
        </button>
      </form>
      <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
        <p className="text-sm text-neutral-600 mb-3">Already have an account?</p>
        <a href="/auth/login" className="btn-secondary w-full">
          Log in
        </a>
      </div>
    </div>
  );
}
