import Link from "next/link";

const colorMap: Record<string, string> = {
  green: "bg-brand-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
};

export default function DashboardStatCard({
  icon,
  value,
  label,
  href,
  color = "green",
}: {
  icon: string;
  value: string | number;
  label: string;
  href?: string;
  color?: "green" | "blue" | "orange" | "purple" | "red";
}) {
  const content = (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} text-white flex items-center justify-center text-lg mb-4`}>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900 leading-none">{value}</p>
      <p className="text-xs text-neutral-500 mt-1.5">{label}</p>
      {href && (
        <span className="text-xs font-semibold text-neutral-400 mt-3 inline-flex items-center gap-1">
          View details <span aria-hidden="true">→</span>
        </span>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
