import { describe, it, expect } from "vitest";
import { preparePhoneForStorage } from "@/lib/phone";
import { csvEscape, toCsv } from "@/lib/csv";

describe("CSV formula-safe escape", () => {
  it("prefixes dangerous cells", () => {
    expect(csvEscape("=1+1")).toBe("'=1+1");
    expect(csvEscape("+cmd")).toBe("'+cmd");
    expect(csvEscape("-1")).toBe("'-1");
    expect(csvEscape("@ref")).toBe("'@ref");
  });
  it("quotes commas", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });
  it("toCsv builds UTF-8 lines", () => {
    const out = toCsv(["name", "phone"], [["Ali", "923001112233"]]);
    expect(out).toContain("name,phone");
    expect(out).toContain("Ali,923001112233");
  });
});

describe("CSV dedupe re-import logic", () => {
  it("normalizes phones for dedupe key", () => {
    const a = preparePhoneForStorage("03001112233");
    const b = preparePhoneForStorage("+92 300 1112233");
    expect(a).toBe(b);
  });

  it("simulates re-import skip by phone set", () => {
    const existing = new Set(["923001112233"]);
    const incoming = ["03001112233", "03009998877", "bad"];
    let created = 0;
    let duplicate = 0;
    let invalid = 0;
    const seen = new Set(existing);
    for (const raw of incoming) {
      const phone = preparePhoneForStorage(raw);
      if (!phone) { invalid++; continue; }
      if (seen.has(phone)) { duplicate++; continue; }
      seen.add(phone);
      created++;
    }
    expect(created).toBe(1);
    expect(duplicate).toBe(1);
    expect(invalid).toBe(1);
  });
});
