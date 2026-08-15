import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("produces a header row and one line per data row", () => {
    const result = toCsv([{ name: "Alice", amount: 100 }, { name: "Bob", amount: 200 }]);
    expect(result).toBe("name,amount\nAlice,100\nBob,200");
  });

  it("quotes and escapes values containing commas or quotes", () => {
    const result = toCsv([{ name: 'Smith, "The Great"', amount: 50 }]);
    expect(result).toBe('name,amount\n"Smith, ""The Great""",50');
  });

  it("quotes values containing newlines", () => {
    const result = toCsv([{ note: "line1\nline2", amount: 1 }]);
    expect(result).toBe('note,amount\n"line1\nline2",1');
  });
});
