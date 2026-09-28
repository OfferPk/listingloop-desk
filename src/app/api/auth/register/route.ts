import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  countUsers,
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import {
  checkRateLimit,
  recordRateLimitFailure,
} from "@/lib/rate-limit";

const MIN_PASSWORD = 10;

function clientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const workspaceName =
      String(body.workspace_name || "").trim() || `${name}'s Agency`;

    const ip = clientIp(req);
    const ipKey = `register:ip:${ip}`;
    const lim = checkRateLimit(ipKey);
    if (!lim.ok) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Try again in ${lim.retryAfterSec}s.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(lim.retryAfterSec) },
        }
      );
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD} characters` },
        { status: 400 }
      );
    }
    if (countUsers() > 0) {
      recordRateLimitFailure(ipKey);
      return NextResponse.json(
        { error: "Workspace already exists. Ask an owner/manager to invite you." },
        { status: 403 }
      );
    }
    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      recordRateLimitFailure(ipKey);
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
