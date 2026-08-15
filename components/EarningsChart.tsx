"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function EarningsChart({ data }: { data: { month: string; amountGbp: number }[] }) {
  const hasAnyData = data.some((d) => d.amountGbp > 0);
  if (!hasAnyData) {
    return <p className="text-sm text-neutral-500 text-center py-8">No earnings yet — this fills in once you complete orders.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `£${v}`} />
        <Tooltip formatter={(value: number) => [`£${value.toFixed(2)}`, "Earned"]} />
        <Bar dataKey="amountGbp" fill="#1DBF73" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
