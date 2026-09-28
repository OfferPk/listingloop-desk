import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { Role, SessionUser } from "./types";

const SESSION_COOKIE = "listingloop_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createSession(userId: string, workspaceId: string): string {
  const db = getDb();
  const id = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  db.prepare(
    "INSERT INTO sessions (id, user_id, workspace_id, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, userId, workspaceId, expires.toISOString());
  return id;
}

export function destroySession(sessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, m.role, m.id as membership_id,
              m.status as membership_status, w.id as workspace_id, w.name as workspace_name,
              s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN workspaces w ON w.id = s.workspace_id
       JOIN memberships m ON m.user_id = u.id AND m.workspace_id = w.id
       WHERE s.id = ?`
    )
    .get(sessionId) as
    | {
        id: string;
        email: string;
        name: string;
        role: Role;
        membership_id: string;
        membership_status: string;
        workspace_id: string;
        workspace_name: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    destroySession(sessionId);
    return null;
  }
  if (row.membership_status !== "active") return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    workspace_id: row.workspace_id,
    workspace_name: row.workspace_name,
    membership_id: row.membership_id,
  };
}

type HeaderLike = { get(name: string): string | null };

export function shouldUseSecureCookie(headers?: HeaderLike | null): boolean {
  const env = process.env.COOKIE_SECURE;
  if (env === "false" || env === "0") return false;
  if (env === "true" || env === "1") return true;
  if (headers) {
    const proto = headers.get("x-forwarded-proto");
    if (proto) return proto.split(",")[0].trim().toLowerCase() === "https";
  }
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(
  sessionId: string,
  headers?: HeaderLike | null
) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(headers),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(headers?: HeaderLike | null) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(headers),
    path: "/",
    maxAge: 0,
  });
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

/** Sync gate used by requireManager and unit tests. */
export function assertManagerRole(user: SessionUser): SessionUser {
  if (user.role !== "owner" && user.role !== "manager") {
    throw new AuthError("Forbidden — owners/managers only", 403);
  }
  return user;
}

export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  return assertManagerRole(user);
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new AuthError("Forbidden — owners only", 403);
  }
  return user;
}

export function isManagerOrOwner(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function countUsers(): number {
  const row = getDb().prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  return row.c;
}

export function assertMemberInWorkspace(
  workspaceId: string,
  userId: string
): { role: Role; membership_id: string } {
  const row = getDb()
    .prepare(
      `SELECT id, role FROM memberships
       WHERE workspace_id = ? AND user_id = ? AND status = 'active'`
    )
    .get(workspaceId, userId) as { id: string; role: Role } | undefined;
  if (!row) {
    throw new AuthError("User is not an active member of this workspace", 400);
  }
  return { role: row.role, membership_id: row.id };
}
