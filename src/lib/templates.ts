import type { WaTemplateKey } from "./types";

export const WA_TEMPLATES: Record<
  WaTemplateKey,
  { label: string; body: string }
> = {
  first_response: {
    label: "First response",
    body: "Assalam o Alaikum {{name}}, shukriya inquiry ke liye{{listing}}. Kab free hain details discuss karne ke liye?",
  },
  brochure_sent: {
    label: "Brochure sent",
    body: "Assalam o Alaikum {{name}}, {{listing}} ka brochure share kar raha/rahi hoon. Koi sawal ho to batayein.",
  },
  confirm_visit: {
    label: "Confirm visit",
    body: "Assalam o Alaikum {{name}}, aapki site visit {{visit_date}} ke liye confirm hai{{listing}}. Location pe time pe milte hain.",
  },
  visit_follow_up: {
    label: "Visit follow-up",
    body: "Assalam o Alaikum {{name}}, visit ke baad kaisa laga{{listing}}? Koi sawal ya next step discuss karein?",
  },
  re_engage: {
    label: "Re-engage",
    body: "Assalam o Alaikum {{name}}, thodi der pehle inquiry aayi thi{{listing}}. Abhi bhi interested hain?",
  },
};

export function renderWaTemplate(
  key: WaTemplateKey,
  vars: { name?: string; listing?: string; visit_date?: string }
): string {
  let body = WA_TEMPLATES[key].body;
  const name = vars.name?.trim() || "there";
  const listing = vars.listing?.trim() ? ` (${vars.listing.trim()})` : "";
  const visitDate = vars.visit_date?.trim() || "the scheduled time";
  body = body.replace(/\{\{name\}\}/g, name);
  body = body.replace(/\{\{listing\}\}/g, listing);
  body = body.replace(/\{\{visit_date\}\}/g, visitDate);
  return body;
}
