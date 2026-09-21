import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, destroySession, getSessionCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const sid = jar.get(getSessionCookieName())?.value;
  if (sid) destroySession(sid);
  await clearSessionCookie(req.headers);
  return NextResponse.json({ ok: true });
}
