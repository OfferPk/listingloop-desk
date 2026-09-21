import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getInquiry, recordWaHandoff } from "@/lib/inquiries";
import { toWhatsAppUrl } from "@/lib/phone";
import { renderWaTemplate, WA_TEMPLATES } from "@/lib/templates";
import type { WaTemplateKey } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const inquiry = getInquiry(user, id);
    const templates = (Object.keys(WA_TEMPLATES) as WaTemplateKey[]).map((key) => ({
      key,
      label: WA_TEMPLATES[key].label,
      body: renderWaTemplate(key, {
        name: inquiry.name,
        listing: inquiry.listing_title || inquiry.listing_ref || undefined,
      }),
    }));
    return NextResponse.json({ templates, phone: inquiry.phone });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const inquiry = getInquiry(user, id);
    const templateKey = (body.template_key || null) as WaTemplateKey | null;
    let text = String(body.text || "");
    if (templateKey && WA_TEMPLATES[templateKey] && !text) {
      text = renderWaTemplate(templateKey, {
        name: inquiry.name,
        listing: inquiry.listing_title || inquiry.listing_ref || undefined,
        visit_date: body.visit_date,
      });
    }
    const url = toWhatsAppUrl(inquiry.phone, text || undefined);
    if (!url) return NextResponse.json({ error: "Invalid phone for WhatsApp" }, { status: 400 });
    recordWaHandoff(user, id, templateKey);
    return NextResponse.json({
      url,
      text,
      notice: "WhatsApp will open so you can review and send. ListingLoop never sends messages for you.",
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
