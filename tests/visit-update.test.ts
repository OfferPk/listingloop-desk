import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/types";

const tmpDb = path.join(process.cwd(), "data", "test-visit-update.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("updateVisit authz", () => {
  let closeDb: typeof import("@/lib/db").closeDb;
  let updateVisit: typeof import("@/lib/inquiries").updateVisit;
  let AuthError: typeof import("@/lib/auth").AuthError;
  let agent: SessionUser;
  let manager: SessionUser;
  let otherAgent: SessionUser;
  let visitOwn: string;
  let visitOther: string;

  beforeAll(async () => {
    cleanup();
    fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
    process.env.DATABASE_PATH = tmpDb;
    const dbMod = await import("@/lib/db");
    closeDb = dbMod.closeDb;
    closeDb();
    const db = dbMod.getDb();
    const now = new Date().toISOString();
    const ws = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const agentId = crypto.randomUUID();
    const otherId = crypto.randomUUID();
    const hash = bcrypt.hashSync("password12345", 10);
    db.prepare(
      `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?,?, 'PKR','Asia/Karachi',?)`
    ).run(ws, "V", now);
    for (const [id, email, name] of [
      [managerId, "m@t.local", "M"],
      [agentId, "a@t.local", "A"],
      [otherId, "o@t.local", "O"],
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
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, otherId, "agent");

    const inqOwn = crypto.randomUUID();
    const inqOther = crypto.randomUUID();
    for (const [id, owner] of [
      [inqOwn, agentId],
      [inqOther, otherId],
    ] as const) {
      db.prepare(
        `INSERT INTO inquiries (
          id, workspace_id, listing_id, owner_id, created_by, name, phone, email, source,
          source_detail, external_ref, property_type, preferred_locality, budget_min_minor,
          budget_max_minor, currency, bedrooms, message, stage, next_follow_up_at, lost_reason,
          created_at, updated_at
        ) VALUES (?,?,null,?,?,?,?,null,'whatsapp',null,null,null,null,null,null,'PKR',null,null,'visit_scheduled',null,null,?,?)`
      ).run(id, ws, owner, managerId, "Lead", "923001112233", now, now);
    }
    visitOwn = crypto.randomUUID();
    visitOther = crypto.randomUUID();
    db.prepare(
      `INSERT INTO inquiry_visits (id, inquiry_id, scheduled_at, status, outcome_note, created_by, updated_at)
       VALUES (?,?,?,'scheduled',null,?,?)`
    ).run(visitOwn, inqOwn, now, agentId, now);
    db.prepare(
      `INSERT INTO inquiry_visits (id, inquiry_id, scheduled_at, status, outcome_note, created_by, updated_at)
       VALUES (?,?,?,'scheduled',null,?,?)`
    ).run(visitOther, inqOther, now, otherId, now);

    manager = {
      id: managerId,
      email: "m@t.local",
      name: "M",
      role: "manager",
      workspace_id: ws,
      workspace_name: "V",
      membership_id: "mm",
    };
    agent = {
      id: agentId,
      email: "a@t.local",
      name: "A",
      role: "agent",
      workspace_id: ws,
      workspace_name: "V",
      membership_id: "ma",
    };
    otherAgent = {
      id: otherId,
      email: "o@t.local",
      name: "O",
      role: "agent",
      workspace_id: ws,
      workspace_name: "V",
      membership_id: "mo",
    };
    updateVisit = (await import("@/lib/inquiries")).updateVisit;
    AuthError = (await import("@/lib/auth")).AuthError;
  });

  afterAll(() => {
    closeDb();
    cleanup();
  });

  it("agent can update own inquiry visit", () => {
    const v = updateVisit(agent, visitOwn, {
      status: "completed",
      outcome_note: "Visit done",
    });
    expect(v.status).toBe("completed");
    expect(v.outcome_note).toBe("Visit done");
  });

  it("agent cannot update another agent's visit", () => {
    try {
      updateVisit(agent, visitOther, { status: "no_show" });
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as InstanceType<typeof AuthError>).status).toBe(403);
    }
  });

  it("manager can update any visit in workspace", () => {
    const v = updateVisit(manager, visitOther, { status: "cancelled" });
    expect(v.status).toBe("cancelled");
  });
});
