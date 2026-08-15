// FIXED (Milestone 17 gap): no export capability existed at all. This is
// genuinely CSV, not a native .xlsx binary format — labeled honestly as
// "Excel-compatible" rather than overclaiming a real Excel file, since
// Excel (and Google Sheets, and Numbers) all open CSV natively and this
// avoids taking on a whole new binary-format dependency for what a
// reporting export actually needs: rows of data a spreadsheet can open.
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return lines.join("\n");
}
