import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { createListing, listListings } from "@/lib/listings";
import type { ListingStatus } from "@/lib/types";

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
    const status = (sp.get("status") || "all") as ListingStatus | "all";
    const q = sp.get("q") || undefined;
    return NextResponse.json({ listings: listListings(user, { status, q }) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const listing = createListing(user, body);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
