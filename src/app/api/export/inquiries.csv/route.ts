import { NextRequest, NextResponse } from "next/server";
import { AuthError, isManagerOrOwner, requireUser } from "@/lib/auth";
import { listInquiries } from "@/lib/inquiries";
import { toCsv } from "@/lib/csv";
import { STAGES, type Stage } from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/export/inquiries.csv
 * Query (optional):
 *   stage — single or comma list (must be valid Stage values)
 *   from / to — YYYY-MM-DD inclusive window on **created_at** (not updated_at)
 * Managers/owners only; agents → 403.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!isManagerOrOwner(user.role)) {
      return NextResponse.json({ error: "Owners/managers only" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const stageParam = sp.get("stage")?.trim() || "";
    const from = sp.get("from")?.trim() || "";
    const to = sp.get("to")?.trim() || "";

    if (from && !ISO_DATE.test(from)) {
      return NextResponse.json({ error: "from must be YYYY-MM-DD" }, { status: 400 });
    }
    if (to && !ISO_DATE.test(to)) {
      return NextResponse.json({ error: "to must be YYYY-MM-DD" }, { status: 400 });
    }

    let stage: string | undefined;
    if (stageParam) {
      const parts = stageParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => STAGES.includes(s as Stage));
      if (parts.length === 0) {
        return NextResponse.json({ error: "Invalid stage filter" }, { status: 400 });
      }
      stage = parts.join(",");
    }

    // Date window filters on created_at (see listInquiries InquiryFilters).
    const inquiries = listInquiries(user, {
      stage,
      from: from || undefined,
      to: to || undefined,
    });

    const headers = [
      "id",
      "name",
      "phone",
      "email",
      "source",
      "source_detail",
      "stage",
      "listing_ref",
      "owner_name",
      "preferred_locality",
      "budget_min_minor",
      "budget_max_minor",
      "currency",
      "next_follow_up_at",
      "lost_reason",
      "external_ref",
      "created_at",
      "updated_at",
    ];
    const rows = inquiries.map((i) => [
      i.id,
      i.name,
      i.phone,
      i.email,
      i.source,
      i.source_detail,
      i.stage,
      i.listing_ref,
      i.owner_name,
      i.preferred_locality,
      i.budget_min_minor,
      i.budget_max_minor,
      i.currency,
      i.next_follow_up_at,
      i.lost_reason,
      i.external_ref,
      i.created_at,
      i.updated_at,
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
