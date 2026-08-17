"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };

// Every href below points at a route that already exists in this app —
// no new pages were created for this redesign, only this navigation
// shell around them. Where this app keeps a section on the dashboard
// page itself rather than a separate route (e.g. a freelancer's teams),
// no sidebar item was invented for it, to avoid a link that goes nowhere
// new.
const navByRole: Record<string, NavItem[]> = {
  CLIENT: [
    { label: "Overview", href: "/dashboard/client", icon: "🏠" },
    { label: "Orders", href: "/dashboard/client/orders", icon: "🧾" },
    { label: "Post requirement", href: "/projects/new", icon: "📋" },
    { label: "Company profile", href: "/dashboard/client/profile", icon: "🏢" },
    { label: "Payments", href: "/dashboard/payments", icon: "💳" },
    { label: "Browse freelancers", href: "/freelancers", icon: "🔍" },
    { label: "Messages", href: "/messages", icon: "💬" },
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ],
  FREELANCER: [
    { label: "Overview", href: "/dashboard/freelancer", icon: "🏠" },
    { label: "Edit profile", href: "/dashboard/freelancer/profile", icon: "👤" },
    { label: "Create gig", href: "/dashboard/freelancer/gigs/new", icon: "➕" },
    { label: "Browse projects", href: "/projects", icon: "🔎" },
    { label: "Orders", href: "/dashboard/freelancer/orders", icon: "🧾" },
    { label: "Payments", href: "/dashboard/payments", icon: "💳" },
    { label: "Availability", href: "/dashboard/freelancer/availability", icon: "📅" },
    { label: "Subscription", href: "/dashboard/freelancer/subscription", icon: "⭐" },
    { label: "Messages", href: "/messages", icon: "💬" },
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ],
  ADMIN: [
    { label: "Overview", href: "/dashboard/admin", icon: "🏠" },
    { label: "Manage gigs", href: "/dashboard/admin/gigs", icon: "🧰" },
    { label: "Manage projects", href: "/dashboard/admin/projects", icon: "📋" },
    { label: "Team requests", href: "/dashboard/admin/team-orders", icon: "👥" },
    { label: "Manage users", href: "/dashboard/admin/users", icon: "🧑‍💼" },
    { label: "Reports", href: "/dashboard/admin/reports", icon: "📊" },
    { label: "Audit log", href: "/dashboard/admin/audit-log", icon: "🗒️" },
  ],
};

export default function DashboardSidebar({ role }: { role: "CLIENT" | "FREELANCER" | "ADMIN" }) {
  const pathname = usePathname();
  const items = navByRole[role] ?? [];

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-neutral-200 bg-white min-h-[calc(100vh-70px)] px-3 py-6 sticky top-[70px] self-start">
      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide px-3 mb-2">Dashboard</p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isOverview = item.label === "Overview";
          const isActive = isOverview ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700 font-semibold" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
