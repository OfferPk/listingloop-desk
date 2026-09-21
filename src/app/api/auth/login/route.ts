import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const db = getDb();
    const user = db
      .prepare(`SELECT id, email, name, password_hash FROM users WHERE email = ?`)
      .get(email) as { id: string; email: string; name: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const membership = db
      .prepare(
        `SELECT m.role, m.workspace_id, w.name as workspace_name
         FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
         WHERE m.user_id = ? AND m.status = 'active'
         ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END
         LIMIT 1`
      )
      .get(user.id) as { role: Role; workspace_id: string; workspace_name: string } | undefined;
    if (!membership) {
      return NextResponse.json({ error: "No active workspace membership" }, { status: 403 });
    }
    const sessionId = createSession(user.id, membership.workspace_id);
    await setSessionCookie(sessionId, req.headers);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        workspace_id: membership.workspace_id,
        workspace_name: membership.workspace_name,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
