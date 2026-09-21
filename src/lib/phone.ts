export function normalizePhoneDigits(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function rewritePkLocalPhone(digits: string): string {
  if (digits.startsWith("03") && digits.length === 11) {
    return "92" + digits.slice(1);
  }
  return digits;
}

export function preparePhoneForStorage(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;
  const raw = phone.replace(/\D/g, "");
  const rewritten = rewritePkLocalPhone(raw);
  return normalizePhoneDigits(rewritten);
}

export function toWhatsAppUrl(phone: string, text?: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (text && text.trim()) {
    return `${base}?text=${encodeURIComponent(text.trim())}`;
  }
  return base;
}

export function phoneHint(phone: string): string | null {
  if (!phone || typeof phone !== "string") {
    return "Enter a phone with country code (e.g. 923001234567).";
  }
  const raw = phone.replace(/\D/g, "");
  if (raw.length < 8) {
    return "Enter a phone with country code (e.g. 923001234567).";
  }
  if (raw.startsWith("03") && raw.length === 11) {
    return "Looks like a local PK number. Prefer 92… (drop the leading 0) for WhatsApp.";
  }
  return null;
}

export const PHONE_REQUIRED_HINT =
  "Valid phone with country code required (e.g. 923001234567)";
