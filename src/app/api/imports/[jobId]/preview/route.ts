import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireManager } from "@/lib/auth";
import { previewImport } from "@/lib/imports";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireManager();
    const { jobId } = await params;
    return NextResponse.json({ preview: previewImport(user, jobId) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
