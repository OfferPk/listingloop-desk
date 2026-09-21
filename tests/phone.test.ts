import { describe, it, expect } from "vitest";
import {
  normalizePhoneDigits,
  rewritePkLocalPhone,
  preparePhoneForStorage,
  toWhatsAppUrl,
  phoneHint,
} from "@/lib/phone";

describe("normalizePhoneDigits", () => {
  it("strips non-digits", () => {
    expect(normalizePhoneDigits("+92 300 1112233")).toBe("923001112233");
    expect(normalizePhoneDigits("(92) 300-111-2233")).toBe("923001112233");
  });
  it("rejects short input", () => {
    expect(normalizePhoneDigits("123")).toBeNull();
    expect(normalizePhoneDigits("")).toBeNull();
  });
});

describe("preparePhoneForStorage", () => {
  it("rewrites PK 03… to 92…", () => {
    expect(rewritePkLocalPhone("03001234567")).toBe("923001234567");
    expect(preparePhoneForStorage("03001234567")).toBe("923001234567");
    expect(preparePhoneForStorage("0300-123-4567")).toBe("923001234567");
  });
  it("keeps country-coded numbers", () => {
    expect(preparePhoneForStorage("+92 300 1234567")).toBe("923001234567");
  });
  it("rejects unusable phones", () => {
    expect(preparePhoneForStorage("123")).toBeNull();
  });
});

describe("toWhatsAppUrl", () => {
  it("builds wa.me link", () => {
    expect(toWhatsAppUrl("923001112233")).toBe("https://wa.me/923001112233");
    expect(toWhatsAppUrl("+92 300 1112233", "Hello")).toBe(
      "https://wa.me/923001112233?text=Hello"
    );
  });
  it("returns null for invalid", () => {
    expect(toWhatsAppUrl("abc")).toBeNull();
  });
});

describe("phoneHint", () => {
  it("warns on local PK format", () => {
    expect(phoneHint("03001234567")).toMatch(/92/);
  });
  it("silent for proper numbers", () => {
    expect(phoneHint("923001234567")).toBeNull();
  });
});
