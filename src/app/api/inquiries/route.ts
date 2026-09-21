import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { createInquiry, listInquiries } from "@/lib/inquiries";

function jsonError(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = new URL(req.url).searchParams;
    const inquiries = listInquiries(user, {
      listing_id: sp.get("listing_id") || undefined,
      owner_id: sp.get("owner_id") || undefined,
      source: sp.get("source") || undefined,
      stage: sp.get("stage") || undefined,
      locality: sp.get("locality") || undefined,
      q: sp.get("q") || undefined,
    });
    return NextResponse.json({ inquiries });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const inquiry = createInquiry(user, body);
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
