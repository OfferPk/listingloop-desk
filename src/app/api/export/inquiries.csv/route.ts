import { NextResponse } from "next/server";
import { AuthError, isManagerOrOwner, requireUser } from "@/lib/auth";
import { listInquiries } from "@/lib/inquiries";
import { toCsv } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireUser();
    if (!isManagerOrOwner(user.role)) {
      return NextResponse.json({ error: "Owners/managers only" }, { status: 403 });
    }
    const inquiries = listInquiries(user, {});
    const headers = [
      "id", "name", "phone", "email", "source", "source_detail", "stage",
      "listing_ref", "owner_name", "preferred_locality", "budget_min_minor",
      "budget_max_minor", "currency", "next_follow_up_at", "lost_reason",
      "external_ref", "created_at", "updated_at",
    ];
    const rows = inquiries.map((i) => [
      i.id, i.name, i.phone, i.email, i.source, i.source_detail, i.stage,
      i.listing_ref, i.owner_name, i.preferred_locality, i.budget_min_minor,
      i.budget_max_minor, i.currency, i.next_follow_up_at, i.lost_reason,
      i.external_ref, i.created_at, i.updated_at,
    ]);
    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inquiries.csv"',
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
