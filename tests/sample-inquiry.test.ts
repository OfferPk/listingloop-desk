import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/types";

const tmpDb = path.join(process.cwd(), "data", "test-sample-inquiry.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("createSampleInquiry authz + seed", () => {
  let closeDb: typeof import("@/lib/db").closeDb;
  let createSampleInquiry: typeof import("@/lib/inquiries").createSampleInquiry;
  let AuthError: typeof import("@/lib/auth").AuthError;
  let getImportCadenceState: typeof import("@/lib/imports").getImportCadenceState;
  let getDb: typeof import("@/lib/db").getDb;
  let manager: SessionUser;
  let agent: SessionUser;
  let ws: string;

  beforeAll(async () => {
    cleanup();
    fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
    process.env.DATABASE_PATH = tmpDb;
    const dbMod = await import("@/lib/db");
    closeDb = dbMod.closeDb;
    closeDb();
    const db = dbMod.getDb();
    const now = new Date().toISOString();
    ws = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const agentId = crypto.randomUUID();
    const hash = bcrypt.hashSync("password12345", 10);
    db.prepare(
      `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?,?, 'PKR','Asia/Karachi',?)`
    ).run(ws, "SampleWS", now);
    for (const [id, email, name] of [
      [managerId, "m@sample.local", "M"],
      [agentId, "a@sample.local", "A"],
    ] as const) {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?,?,?,?,?)`
      ).run(id, email, hash, name, now);
    }
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, managerId, "manager");
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, agentId, "agent");

    manager = {
      id: managerId,
      email: "m@sample.local",
      name: "M",
      role: "manager",
      workspace_id: ws,
      workspace_name: "SampleWS",
      membership_id: "mm",
    };
    agent = {
      id: agentId,
      email: "a@sample.local",
      name: "A",
      role: "agent",
      workspace_id: ws,
      workspace_name: "SampleWS",
      membership_id: "ma",
    };

    const inqMod = await import("@/lib/inquiries");
    createSampleInquiry = inqMod.createSampleInquiry;
    AuthError = (await import("@/lib/auth")).AuthError;
    getImportCadenceState = (await import("@/lib/imports")).getImportCadenceState;
    getDb = dbMod.getDb;
  });

  afterAll(() => {
    closeDb();
    cleanup();
  });

  it("rejects agent with 403", () => {
    try {
      createSampleInquiry(agent);
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as InstanceType<typeof AuthError>).status).toBe(403);
    }
  });

  it("manager creates listing + inquiry with follow-up today", () => {
    const { listing, inquiry } = createSampleInquiry(manager);
    expect(listing.listing_ref.startsWith("SAMPLE-")).toBe(true);
    expect(inquiry.name).toMatch(/Sample Inquiry/i);
    expect(inquiry.listing_id).toBe(listing.id);
    expect(inquiry.next_follow_up_at).toBeTruthy();
    const fu = new Date(inquiry.next_follow_up_at!);
    const today = new Date();
    expect(fu.toDateString()).toBe(today.toDateString());
    expect(inquiry.preferred_locality).toMatch(/DHA/i);
  });

  it("import cadence: empty jobs → no banner", () => {
    const state = getImportCadenceState(manager);
    expect(state.show).toBe(false);
  });

  it("import cadence: only failed jobs → show banner", () => {
    const db = getDb();
    const old = new Date();
    old.setDate(old.getDate() - 1);
    db.prepare(
      `INSERT INTO import_jobs (
        id, workspace_id, uploaded_by, filename, mapping_json, headers_json,
        row_count, status, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(
      crypto.randomUUID(),
      ws,
      manager.id,
      "fail.csv",
      "{}",
      "[]",
      1,
      "failed",
      old.toISOString()
    );
    const state = getImportCadenceState(manager);
    expect(state.show).toBe(true);
    expect(state.lastSuccessfulAt).toBeNull();
  });

  it("import cadence: recent successful commit → hide; stale → show", () => {
    const db = getDb();
    const recent = new Date().toISOString();
    db.prepare(
      `INSERT INTO import_jobs (
        id, workspace_id, uploaded_by, filename, mapping_json, headers_json,
        row_count, status, created_at, finished_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      crypto.randomUUID(),
      ws,
      manager.id,
      "ok.csv",
      "{}",
      "[]",
      2,
      "done",
      recent,
      recent
    );
    expect(getImportCadenceState(manager).show).toBe(false);

    const stale = new Date();
    stale.setDate(stale.getDate() - 4);
    db.prepare(
      `UPDATE import_jobs SET created_at = ?, finished_at = ? WHERE status = 'done'`
    ).run(stale.toISOString(), stale.toISOString());
    const state = getImportCadenceState(manager);
    expect(state.show).toBe(true);
    expect(state.lastSuccessfulAt).toBeTruthy();
  });
});
