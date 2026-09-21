import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const seedDb = path.join(process.cwd(), "data", "test-seed-smoke.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = seedDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe("seed smoke", () => {
  beforeAll(() => {
    cleanup();
    execSync("npx tsx scripts/seed.ts", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_PATH: seedDb },
      stdio: "pipe",
    });
  }, 60000);

  afterAll(() => cleanup());

  it("creates demo users with working passwords", () => {
    const db = new Database(seedDb, { readonly: true });
    const owner = db
      .prepare(`SELECT password_hash FROM users WHERE email = ?`)
      .get("owner@listingloop.local") as { password_hash: string };
    expect(bcrypt.compareSync("owner123", owner.password_hash)).toBe(true);
    const manager = db
      .prepare(`SELECT email FROM users WHERE email = ?`)
      .get("manager@listingloop.local");
    const agent = db
      .prepare(`SELECT email FROM users WHERE email = ?`)
      .get("agent@listingloop.local");
    expect(manager).toBeTruthy();
    expect(agent).toBeTruthy();
    db.close();
  });

  it("seeds listings and inquiries across stages", () => {
    const db = new Database(seedDb, { readonly: true });
    const listings = (db.prepare(`SELECT COUNT(*) as c FROM listings`).get() as { c: number }).c;
    const inquiries = (db.prepare(`SELECT COUNT(*) as c FROM inquiries`).get() as { c: number }).c;
    expect(listings).toBeGreaterThanOrEqual(5);
    expect(inquiries).toBeGreaterThanOrEqual(10);
    const stages = db.prepare(`SELECT DISTINCT stage FROM inquiries`).all() as { stage: string }[];
    const set = new Set(stages.map((s) => s.stage));
    for (const s of ["new", "contacted", "visit_scheduled", "negotiation", "won", "lost"]) {
      expect(set.has(s)).toBe(true);
    }
    db.close();
  });

  it("has overdue follow-up and visit today", () => {
    const db = new Database(seedDb, { readonly: true });
    const now = new Date().toISOString();
    const overdue = db
      .prepare(
        `SELECT COUNT(*) as c FROM inquiries
         WHERE next_follow_up_at < ? AND stage NOT IN ('won','lost')`
      )
      .get(now) as { c: number };
    expect(overdue.c).toBeGreaterThanOrEqual(1);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const visits = db
      .prepare(
        `SELECT COUNT(*) as c FROM inquiry_visits
         WHERE status = 'scheduled' AND scheduled_at >= ? AND scheduled_at <= ?`
      )
      .get(start.toISOString(), end.toISOString()) as { c: number };
    expect(visits.c).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
