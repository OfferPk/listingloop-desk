import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { AuthError, hashPassword, requireManager } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireManager();
    const rows = getDb()
      .prepare(
        `SELECT m.id as membership_id, m.role, m.status, u.id, u.email, u.name, u.created_at
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.workspace_id = ? ORDER BY m.role, u.name`
      )
      .all(user.workspace_id);
    return NextResponse.json({ users: rows });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireManager();
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const role = String(body.role || "agent") as Role;
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, password required" }, { status: 400 });
    }
    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    }
    if (!["owner", "manager", "agent"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (role === "owner" && actor.role !== "owner") {
      return NextResponse.json({ error: "Only owners can create owners" }, { status: 403 });
    }
    const db = getDb();
    let userId: string;
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
    const now = new Date().toISOString();
    if (existing) {
      userId = existing.id;
      const mem = db
        .prepare(`SELECT id FROM memberships WHERE workspace_id = ? AND user_id = ?`)
        .get(actor.workspace_id, userId);
      if (mem) return NextResponse.json({ error: "Already in workspace" }, { status: 409 });
    } else {
      userId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(userId, email, hashPassword(password), name, now);
    }
    const membershipId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?, ?, ?, ?, 'active')`
    ).run(membershipId, actor.workspace_id, userId, role);
    return NextResponse.json({ user: { id: userId, email, name, role, membership_id: membershipId } }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
