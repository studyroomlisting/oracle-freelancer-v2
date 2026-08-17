import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import type { ReactNode } from "react";

export default function DashboardShell({
  role,
  greeting,
  subtitle,
  actions,
  children,
}: {
  role: "CLIENT" | "FREELANCER" | "ADMIN";
  greeting: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex bg-neutral-50 min-h-[calc(100vh-70px)]">
      <DashboardSidebar role={role} />
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{greeting}</h1>
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
