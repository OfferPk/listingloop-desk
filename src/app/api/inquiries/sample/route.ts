import { NextResponse } from "next/server";
import { AuthError, requireManager } from "@/lib/auth";
import { createSampleInquiry } from "@/lib/inquiries";

export async function POST() {
  try {
    const user = await requireManager();
    const result = createSampleInquiry(user);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Could not create sample inquiry" },
      { status: 500 }
    );
  }
}
