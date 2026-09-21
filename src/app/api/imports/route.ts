import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { createImportJob, listImportJobs } from "@/lib/imports";

function jsonError(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ jobs: listImportJobs(user) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }
    const text = await (file as File).text();
    const filename = (file as File).name || "upload.csv";
    const job = createImportJob(user, filename, text);
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
