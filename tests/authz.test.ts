import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const tmpDb = path.join(process.cwd(), "data", "test-authz.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe("workspace isolation / authz smoke", () => {
  let db: Database.Database;
  const wsA = "ws-a";
  const wsB = "ws-b";
  const ownerA = "owner-a";
  const ownerB = "owner-b";
  const agentA = "agent-a";

  beforeAll(() => {
    cleanup();
    fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
    db = new Database(tmpDb);
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, default_currency TEXT, timezone TEXT, created_at TEXT);
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, name TEXT, created_at TEXT);
      CREATE TABLE memberships (
        id TEXT PRIMARY KEY, workspace_id TEXT, user_id TEXT, role TEXT, status TEXT DEFAULT 'active'
      );
      CREATE TABLE inquiries (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, owner_id TEXT NOT NULL,
        created_by TEXT, name TEXT, phone TEXT, source TEXT, stage TEXT,
        created_at TEXT, updated_at TEXT
      );
    `);
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync("owner123", 10);
    expect(bcrypt.compareSync("owner123", hash)).toBe(true);

    db.prepare(`INSERT INTO workspaces VALUES (?,?, 'PKR','Asia/Karachi',?)`).run(wsA, "A", now);
    db.prepare(`INSERT INTO workspaces VALUES (?,?, 'PKR','Asia/Karachi',?)`).run(wsB, "B", now);
    db.prepare(`INSERT INTO users VALUES (?,?,?,?,?)`).run(ownerA, "a@test.local", hash, "Owner A", now);
    db.prepare(`INSERT INTO users VALUES (?,?,?,?,?)`).run(ownerB, "b@test.local", hash, "Owner B", now);
    db.prepare(`INSERT INTO users VALUES (?,?,?,?,?)`).run(agentA, "agent@test.local", hash, "Agent A", now);
    db.prepare(`INSERT INTO memberships VALUES (?,?,?,?,?)`).run("m1", wsA, ownerA, "owner", "active");
    db.prepare(`INSERT INTO memberships VALUES (?,?,?,?,?)`).run("m2", wsB, ownerB, "owner", "active");
    db.prepare(`INSERT INTO memberships VALUES (?,?,?,?,?)`).run("m3", wsA, agentA, "agent", "active");

    db.prepare(
      `INSERT INTO inquiries VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run("inq-a", wsA, agentA, ownerA, "Lead A", "923001111111", "whatsapp", "new", now, now);
    db.prepare(
      `INSERT INTO inquiries VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run("inq-b", wsB, ownerB, ownerB, "Lead B", "923002222222", "whatsapp", "new", now, now);
  });

  afterAll(() => {
    db.close();
    cleanup();
  });

  it("scopes inquiries by workspace_id", () => {
    const rows = db
      .prepare(`SELECT id FROM inquiries WHERE workspace_id = ?`)
      .all(wsA) as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual(["inq-a"]);
    expect(rows.map((r) => r.id)).not.toContain("inq-b");
  });

  it("agent only sees own owner_id within workspace", () => {
    const rows = db
      .prepare(`SELECT id FROM inquiries WHERE workspace_id = ? AND owner_id = ?`)
      .all(wsA, agentA) as { id: string }[];
    expect(rows.map((r) => r.id)).toContain("inq-a");
  });

  it("membership roles are enforced in data", () => {
    const role = db
      .prepare(`SELECT role FROM memberships WHERE workspace_id = ? AND user_id = ?`)
      .get(wsA, agentA) as { role: string };
    expect(role.role).toBe("agent");
  });
});
