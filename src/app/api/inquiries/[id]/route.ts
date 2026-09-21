import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getInquiry, moveStage, updateInquiry } from "@/lib/inquiries";
import type { Stage } from "@/lib/types";

function jsonError(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json({ inquiry: getInquiry(user, id) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    if (body.move_stage) {
      const inquiry = moveStage(user, id, body.move_stage as Stage, {
        visit_scheduled_at: body.visit_scheduled_at,
        lost_reason: body.lost_reason,
      });
      return NextResponse.json({ inquiry });
    }
    return NextResponse.json({ inquiry: updateInquiry(user, id, body) });
  } catch (e) {
    return jsonError(e);
  }
}
