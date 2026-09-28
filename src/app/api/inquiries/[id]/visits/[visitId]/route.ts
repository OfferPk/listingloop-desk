import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { updateVisit } from "@/lib/inquiries";
import type { VisitStatus } from "@/lib/types";
import { VISIT_STATUSES } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  try {
    const user = await requireUser();
    const { visitId } = await params;
    const body = await req.json();
    const patch: {
      status?: VisitStatus;
      scheduled_at?: string;
      outcome_note?: string | null;
    } = {};
    if (body.status !== undefined) {
      const status = String(body.status) as VisitStatus;
      if (!VISIT_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid visit status" }, { status: 400 });
      }
      patch.status = status;
    }
    if (body.scheduled_at !== undefined) {
      patch.scheduled_at = String(body.scheduled_at);
    }
    if (body.outcome_note !== undefined) {
      patch.outcome_note =
        body.outcome_note === null ? null : String(body.outcome_note);
    }
    const visit = updateVisit(user, visitId, patch);
    return NextResponse.json({ visit });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
