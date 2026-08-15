"use client";

import { useState } from "react";
import OAuthButtons from "@/components/OAuthButtons";

// A first-time OAuth sign-up needs to know which role to create the
// account as — this app has no separate "pick your role" step after an
// OAuth redirect the way the traditional email/password form does inline,
// so it's asked here, right before the OAuth button is clicked. Existing
// users signing back in via OAuth aren't affected — this only matters the
// very first time (see app/auth/callback/route.ts).
export default function RegisterOAuthSection() {
  const [role, setRole] = useState<"CLIENT" | "FREELANCER">("CLIENT");

  return (
    <div>
      <label className="text-xs text-neutral-500 block mb-2">I'm joining as</label>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setRole("CLIENT")}
          className={`flex-1 text-xs py-2 rounded border ${role === "CLIENT" ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold" : "border-neutral-200 text-neutral-600"}`}
        >
          A client hiring
        </button>
        <button
          type="button"
          onClick={() => setRole("FREELANCER")}
          className={`flex-1 text-xs py-2 rounded border ${role === "FREELANCER" ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold" : "border-neutral-200 text-neutral-600"}`}
        >
          A freelancer offering gigs
        </button>
      </div>
      <OAuthButtons intendedRole={role} />
    </div>
  );
}
