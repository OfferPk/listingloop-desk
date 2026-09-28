import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/types";
import { OPEN_STAGES } from "@/lib/types";

const tmpDb = path.join(process.cwd(), "data", "test-export-filter.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("listInquiries stage + created_at date window (export filters)", () => {
  let closeDb: typeof import("@/lib/db").closeDb;
  let listInquiries: typeof import("@/lib/inquiries").listInquiries;
  let manager: SessionUser;

  beforeAll(async () => {
    cleanup();
    fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
    process.env.DATABASE_PATH = tmpDb;
    const dbMod = await import("@/lib/db");
    closeDb = dbMod.closeDb;
    closeDb();
    const db = dbMod.getDb();
    const ws = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const hash = bcrypt.hashSync("password12345", 10);
    const now = "2026-09-28T12:00:00.000Z";
    db.prepare(
      `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?,?, 'PKR','Asia/Karachi',?)`
    ).run(ws, "ExpWS", now);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?,?,?,?,?)`
    ).run(managerId, "mgr@exp.local", hash, "Mgr", now);
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, managerId, "manager");

    const insert = db.prepare(
      `INSERT INTO inquiries (
        id, workspace_id, listing_id, owner_id, created_by, name, phone, email, source,
        source_detail, external_ref, property_type, preferred_locality, budget_min_minor,
        budget_max_minor, currency, bedrooms, message, stage, next_follow_up_at, lost_reason,
        created_at, updated_at
      ) VALUES (?,?,null,?,?,?,? ,null,'whatsapp',null,null,null,null,null,null,'PKR',null,null,?,null,null,?,?)`
    );

    // early new
    insert.run(
      crypto.randomUUID(),
      ws,
      managerId,
      managerId,
      "Early New",
      "923001000001",
      "new",
      "2026-09-01T10:00:00.000Z",
      "2026-09-01T10:00:00.000Z"
    );
    // mid won
    insert.run(
      crypto.randomUUID(),
      ws,
      managerId,
      managerId,
      "Mid Won",
      "923001000002",
      "won",
      "2026-09-15T10:00:00.000Z",
      "2026-09-20T10:00:00.000Z"
    );
    // late lost
    insert.run(
      crypto.randomUUID(),
      ws,
      managerId,
      managerId,
      "Late Lost",
      "923001000003",
      "lost",
      "2026-09-25T10:00:00.000Z",
      "2026-09-26T10:00:00.000Z"
    );
    // late contacted (open)
    insert.run(
      crypto.randomUUID(),
      ws,
      managerId,
      managerId,
      "Late Contacted",
      "923001000004",
      "contacted",
      "2026-09-25T11:00:00.000Z",
      "2026-09-25T11:00:00.000Z"
    );

    manager = {
      id: managerId,
      email: "mgr@exp.local",
      name: "Mgr",
      role: "manager",
      workspace_id: ws,
      workspace_name: "ExpWS",
      membership_id: "m1",
    };

    const inqMod = await import("@/lib/inquiries");
    listInquiries = inqMod.listInquiries;
  });

  afterAll(() => {
    closeDb();
    cleanup();
  });

  it("returns all without filters", () => {
    expect(listInquiries(manager, {}).length).toBe(4);
  });

  it("filters single stage", () => {
    expect(listInquiries(manager, { stage: "won" }).map((r) => r.name)).toEqual([
      "Mid Won",
    ]);
  });

  it("filters comma stage list (open active)", () => {
    const rows = listInquiries(manager, { stage: OPEN_STAGES.join(",") });
    expect(rows.map((r) => r.name).sort()).toEqual(["Early New", "Late Contacted"]);
  });

  it("filters created_at from/to window", () => {
    const rows = listInquiries(manager, { from: "2026-09-15", to: "2026-09-20" });
    expect(rows.map((r) => r.name)).toEqual(["Mid Won"]);
  });

  it("combines stage + date window", () => {
    const rows = listInquiries(manager, {
      stage: "lost,contacted",
      from: "2026-09-25",
      to: "2026-09-28",
    });
    expect(rows.map((r) => r.name).sort()).toEqual(["Late Contacted", "Late Lost"]);
  });
});
