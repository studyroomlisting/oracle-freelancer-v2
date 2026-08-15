"use client";

export default function SortSelect({ options, defaultValue }: { options: { value: string; label: string }[]; defaultValue: string }) {
  return (
    <select
      name="sort"
      className="input w-auto"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
