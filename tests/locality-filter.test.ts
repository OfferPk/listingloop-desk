import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/types";

const tmpDb = path.join(process.cwd(), "data", "test-locality-filter.db");

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) {
    const p = tmpDb + s;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("listInquiries locality filter", () => {
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
    const now = new Date().toISOString();
    const ws = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const hash = bcrypt.hashSync("password12345", 10);
    db.prepare(
      `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?,?, 'PKR','Asia/Karachi',?)`
    ).run(ws, "LocWS", now);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?,?,?,?,?)`
    ).run(managerId, "mgr@loc.local", hash, "Mgr", now);
    db.prepare(
      `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?,?,?,?,'active')`
    ).run(crypto.randomUUID(), ws, managerId, "manager");

    const listingDha = crypto.randomUUID();
    const listingBahria = crypto.randomUUID();
    db.prepare(
      `INSERT INTO listings (
        id, workspace_id, listing_ref, title, city, locality, property_type,
        beds, size_text, price_min_minor, price_max_minor, currency,
        public_url, description, status, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,null,null,null,null,'PKR',null,null,'active',?,?)`
    ).run(listingDha, ws, "DHA-1", "DHA House", "Lahore", "DHA Phase 5", "house", now, now);
    db.prepare(
      `INSERT INTO listings (
        id, workspace_id, listing_ref, title, city, locality, property_type,
        beds, size_text, price_min_minor, price_max_minor, currency,
        public_url, description, status, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,null,null,null,null,'PKR',null,null,'active',?,?)`
    ).run(listingBahria, ws, "BAH-1", "Bahria Flat", "Lahore", "Bahria Town", "apartment", now, now);

    const insertInq = db.prepare(
      `INSERT INTO inquiries (
        id, workspace_id, listing_id, owner_id, created_by, name, phone, email, source,
        source_detail, external_ref, property_type, preferred_locality, budget_min_minor,
        budget_max_minor, currency, bedrooms, message, stage, next_follow_up_at, lost_reason,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,null,'whatsapp',null,null,null,?,null,null,'PKR',null,null,'new',null,null,?,?)`
    );
    insertInq.run(
      crypto.randomUUID(),
      ws,
      listingDha,
      managerId,
      managerId,
      "DHA Lead",
      "923001111001",
      null,
      now,
      now
    );
    insertInq.run(
      crypto.randomUUID(),
      ws,
      listingBahria,
      managerId,
      managerId,
      "Bahria Lead",
      "923001111002",
      null,
      now,
      now
    );
    insertInq.run(
      crypto.randomUUID(),
      ws,
      null,
      managerId,
      managerId,
      "Pref Locality Lead",
      "923001111003",
      "Gulberg",
      now,
      now
    );

    manager = {
      id: managerId,
      email: "mgr@loc.local",
      name: "Mgr",
      role: "manager",
      workspace_id: ws,
      workspace_name: "LocWS",
      membership_id: "m1",
    };

    const inqMod = await import("@/lib/inquiries");
    listInquiries = inqMod.listInquiries;
  });

  afterAll(() => {
    closeDb();
    cleanup();
  });

  it("returns all without locality filter", () => {
    const rows = listInquiries(manager, {});
    expect(rows.length).toBe(3);
  });

  it("narrows by listing locality (DHA)", () => {
    const rows = listInquiries(manager, { locality: "DHA" });
    expect(rows.map((r) => r.name)).toEqual(["DHA Lead"]);
  });

  it("narrows by preferred_locality", () => {
    const rows = listInquiries(manager, { locality: "Gulberg" });
    expect(rows.map((r) => r.name)).toEqual(["Pref Locality Lead"]);
  });

  it("narrows by city via listing join", () => {
    const rows = listInquiries(manager, { locality: "Lahore" });
    expect(rows.map((r) => r.name).sort()).toEqual(["Bahria Lead", "DHA Lead"]);
  });
});
