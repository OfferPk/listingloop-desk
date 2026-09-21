import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { getImportJob, getImportReportRows } from "@/lib/imports";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireUser();
    const { jobId } = await params;
    const job = getImportJob(user, jobId);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows = getImportReportRows(user, jobId);
    return NextResponse.json({ job, rows });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
