import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { endOfDayISO, startOfDayISO } from "@/lib/format";

const tmpDb = path.join(process.cwd(), "data", "test-queues.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe("stage/queue filters", () => {
  let db: Database.Database;

  beforeAll(() => {
    cleanup();
    fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
    db = new Database(tmpDb);
    db.exec(`
      CREATE TABLE inquiries (
        id TEXT PRIMARY KEY, workspace_id TEXT, owner_id TEXT, name TEXT, phone TEXT,
        stage TEXT, next_follow_up_at TEXT
      );
      CREATE TABLE inquiry_visits (
        id TEXT PRIMARY KEY, inquiry_id TEXT, scheduled_at TEXT, status TEXT
      );
    `);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);

    db.prepare(`INSERT INTO inquiries VALUES (?,?,?,?,?,?,?)`).run(
      "overdue", "ws", "u1", "Overdue", "923001111111", "contacted", yesterday.toISOString()
    );
    db.prepare(`INSERT INTO inquiries VALUES (?,?,?,?,?,?,?)`).run(
      "future", "ws", "u1", "Future", "923002222222", "new", tomorrow.toISOString()
    );
    db.prepare(`INSERT INTO inquiries VALUES (?,?,?,?,?,?,?)`).run(
      "won", "ws", "u1", "Won", "923003333333", "won", yesterday.toISOString()
    );
    db.prepare(`INSERT INTO inquiry_visits VALUES (?,?,?,?)`).run(
      "v1", "overdue", todayNoon.toISOString(), "scheduled"
    );
  });

  afterAll(() => {
    db.close();
    cleanup();
  });

  it("lists overdue open follow-ups", () => {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        `SELECT id FROM inquiries
         WHERE next_follow_up_at IS NOT NULL AND next_follow_up_at < ?
           AND stage NOT IN ('won','lost')`
      )
      .all(now) as { id: string }[];
    expect(rows.map((r) => r.id)).toContain("overdue");
    expect(rows.map((r) => r.id)).not.toContain("future");
    expect(rows.map((r) => r.id)).not.toContain("won");
  });

  it("finds visits scheduled today", () => {
    const rows = db
      .prepare(
        `SELECT id FROM inquiry_visits
         WHERE status = 'scheduled' AND scheduled_at >= ? AND scheduled_at <= ?`
      )
      .all(startOfDayISO(), endOfDayISO()) as { id: string }[];
    expect(rows.map((r) => r.id)).toContain("v1");
  });

  it("filters by stage", () => {
    const rows = db
      .prepare(`SELECT id FROM inquiries WHERE stage = ?`)
      .all("new") as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual(["future"]);
  });
});
