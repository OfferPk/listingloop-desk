import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getDashboardStats, getTodayQueue } from "@/lib/inquiries";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      stats: getDashboardStats(user),
      queue: getTodayQueue(user),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
