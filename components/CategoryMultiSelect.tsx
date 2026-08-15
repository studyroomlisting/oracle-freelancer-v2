"use client";

import { categoryNameToModuleCode, parseOracleModules } from "@/lib/onboarding";

type Category = { slug: string; name: string };

export default function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string; // comma-separated module codes (oracleModules format)
  onChange: (value: string) => void;
}) {
  const selected = new Set(parseOracleModules(value));

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next).join(","));
  }

  return (
    <div>
      <label className="text-sm font-semibold text-neutral-800 block mb-2">Skills / categories</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map((c) => {
          const code = categoryNameToModuleCode(c.name);
          return (
            <label key={c.slug} className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={selected.has(code)} onChange={() => toggle(code)} className="rounded border-neutral-300" />
              {c.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
