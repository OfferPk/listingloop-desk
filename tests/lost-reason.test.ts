import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/types";
import { LOST_REASON_PRESETS, MAX_LOST_REASON_LENGTH } from "@/lib/types";

const tmpDb = path.join(process.cwd(), "data", "test-lost-reason.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("lost_reason presets + moveStage PATCH body", () => {
  let closeDb: typeof import("@/lib/db").closeDb;
  let moveStage: typeof import("@/lib/inquiries").moveStage;
  let getInquiry: typeof import("@/lib/inquiries").getInquiry;
  let manager: SessionUser;
  let inquiryId: string;

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
    const hash = bcrypt.hashSync("password12345", 10);
    db.prepare(
      `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?,?, 'PKR','Asia/Karachi',?)`
    ).run(ws, "LostWS", now);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?,?,?,?,?)`
    ).run(managerId, "mgr@lost.local", hash, "Mgr", now);
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, managerId, "manager");

    inquiryId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO inquiries (
        id, workspace_id, listing_id, owner_id, created_by, name, phone, email, source,
        source_detail, external_ref, property_type, preferred_locality, budget_min_minor,
        budget_max_minor, currency, bedrooms, message, stage, next_follow_up_at, lost_reason,
        created_at, updated_at
      ) VALUES (?,?,null,?,?,?,? ,null,'whatsapp',null,null,null,null,null,null,'PKR',null,null,'new',null,null,?,?)`
    ).run(inquiryId, ws, managerId, managerId, "Lead", "923009990001", now, now);

    manager = {
      id: managerId,
      email: "mgr@lost.local",
      name: "Mgr",
      role: "manager",
      workspace_id: ws,
      workspace_name: "LostWS",
      membership_id: "m1",
    };

    const inqMod = await import("@/lib/inquiries");
    moveStage = inqMod.moveStage;
    getInquiry = inqMod.getInquiry;
  });

  afterAll(() => {
    closeDb();
    cleanup();
  });

  it("exposes Budget / Location / Timing / Went silent / Other presets", () => {
    expect(LOST_REASON_PRESETS.map((p) => p.label)).toEqual([
      "Budget",
      "Location/mismatch",
      "Timing",
      "Went silent",
      "Other",
    ]);
    expect(MAX_LOST_REASON_LENGTH).toBe(120);
  });

  it("moveStage to lost stores preset label as lost_reason (PATCH body contract)", () => {
    const updated = moveStage(manager, inquiryId, "lost", {
      lost_reason: "Budget",
    });
    expect(updated.stage).toBe("lost");
    expect(updated.lost_reason).toBe("Budget");
    expect(getInquiry(manager, inquiryId).lost_reason).toBe("Budget");
  });

  it("moveStage to lost with null reason clears / stores null (skip)", () => {
    // reset to contacted first
    moveStage(manager, inquiryId, "contacted");
    const updated = moveStage(manager, inquiryId, "lost", { lost_reason: null });
    expect(updated.stage).toBe("lost");
    expect(updated.lost_reason).toBeNull();
  });

  it("clamps lost_reason to MAX_LOST_REASON_LENGTH", () => {
    moveStage(manager, inquiryId, "contacted");
    const long = "x".repeat(MAX_LOST_REASON_LENGTH + 40);
    const updated = moveStage(manager, inquiryId, "lost", { lost_reason: long });
    expect(updated.lost_reason!.length).toBe(MAX_LOST_REASON_LENGTH);
  });
});
