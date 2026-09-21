import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  countUsers,
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const workspaceName =
      String(body.workspace_name || "").trim() || `${name}'s Agency`;
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (countUsers() > 0) {
      return NextResponse.json(
        { error: "Workspace already exists. Ask an owner/manager to invite you." },
        { status: 403 }
      );
    }
    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?, ?, 'PKR', 'Asia/Karachi', ?)`
      ).run(workspaceId, workspaceName, now);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(userId, email, hashPassword(password), name, now);
      db.prepare(
        `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?, ?, ?, 'owner', 'active')`
      ).run(membershipId, workspaceId, userId);
    });
    tx();
    const sessionId = createSession(userId, workspaceId);
    await setSessionCookie(sessionId, req.headers);
    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
          name,
          role: "owner",
          workspace_id: workspaceId,
          workspace_name: workspaceName,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
