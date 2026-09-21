/**
 * Seed demo workspace for ListingLoop Desk.
 * Usage: npm run seed
 */
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH
  ? path.isAbsolute(process.env.DATABASE_PATH)
    ? process.env.DATABASE_PATH
    : path.join(process.cwd(), process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "listingloop.db");

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  const p = dbPath + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Inline migrate (same as src/lib/db.ts)
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_currency TEXT NOT NULL DEFAULT 'PKR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('owner','manager','agent')),
    status TEXT NOT NULL DEFAULT 'active',
    UNIQUE(workspace_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    listing_ref TEXT NOT NULL,
    title TEXT NOT NULL,
    city TEXT,
    locality TEXT,
    property_type TEXT,
    beds INTEGER,
    size_text TEXT,
    price_min_minor INTEGER,
    price_max_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'PKR',
    public_url TEXT,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(workspace_id, listing_ref)
  );
  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    source TEXT NOT NULL,
    source_detail TEXT,
    external_ref TEXT,
    property_type TEXT,
    preferred_locality TEXT,
    budget_min_minor INTEGER,
    budget_max_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'PKR',
    bedrooms INTEGER,
    message TEXT,
    stage TEXT NOT NULL CHECK(stage IN ('new','contacted','visit_scheduled','negotiation','won','lost')),
    next_follow_up_at TEXT,
    lost_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inquiry_visits (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('scheduled','completed','no_show','cancelled')),
    outcome_note TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inquiry_notes (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    template_key TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inquiry_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    inquiry_id TEXT REFERENCES inquiries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    mapping_json TEXT NOT NULL DEFAULT '{}',
    headers_json TEXT NOT NULL DEFAULT '[]',
    sample_rows_json TEXT,
    rows_json TEXT,
    row_count INTEGER NOT NULL DEFAULT 0,
    created_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    invalid_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    default_owner_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE TABLE IF NOT EXISTS import_job_rows (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    phone_raw TEXT,
    phone_normalized TEXT,
    inquiry_id TEXT REFERENCES inquiries(id),
    message TEXT
  );
`);

const hash = (p: string) => bcrypt.hashSync(p, 10);
const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysFrom = (n: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const wsId = crypto.randomUUID();
const ownerId = crypto.randomUUID();
const managerId = crypto.randomUUID();
const agentId = crypto.randomUUID();

db.prepare(
  `INSERT INTO workspaces (id, name, default_currency, timezone, created_at) VALUES (?, ?, 'PKR', 'Asia/Karachi', ?)`
).run(wsId, "Karachi Homes Demo", iso(daysAgo(40)));

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)`
);
insertUser.run(ownerId, "owner@listingloop.local", hash("owner123"), "Ayesha Owner", iso(daysAgo(40)));
insertUser.run(managerId, "manager@listingloop.local", hash("manager123"), "Bilal Manager", iso(daysAgo(30)));
insertUser.run(agentId, "agent@listingloop.local", hash("agent123"), "Sara Agent", iso(daysAgo(20)));

const insertMem = db.prepare(
  `INSERT INTO memberships (id, workspace_id, user_id, role, status) VALUES (?, ?, ?, ?, 'active')`
);
insertMem.run(crypto.randomUUID(), wsId, ownerId, "owner");
insertMem.run(crypto.randomUUID(), wsId, managerId, "manager");
insertMem.run(crypto.randomUUID(), wsId, agentId, "agent");

const listings = [
  { ref: "DHA-A1", title: "DHA Phase 6 3-Bed Apartment", city: "Karachi", loc: "DHA Phase 6", type: "Apartment", beds: 3, size: "1450 sqft", min: 3500000000, max: 3800000000 },
  { ref: "CLF-B2", title: "Clifton Sea View Flat", city: "Karachi", loc: "Clifton Block 2", type: "Apartment", beds: 2, size: "1100 sqft", min: 2800000000, max: 3000000000 },
  { ref: "GUL-H5", title: "Gulshan Villa Corner", city: "Karachi", loc: "Gulshan-e-Iqbal", type: "House", beds: 5, size: "240 sq yd", min: 5500000000, max: 6200000000 },
  { ref: "BAH-P8", title: "Bahria Town Plot", city: "Karachi", loc: "Bahria Town", type: "Plot", beds: null, size: "125 sq yd", min: 1200000000, max: 1350000000 },
  { ref: "PECHS-C3", title: "PECHS Commercial Shop", city: "Karachi", loc: "PECHS Block 2", type: "Commercial", beds: null, size: "600 sqft", min: 4500000000, max: 4800000000 },
  { ref: "OLD-ARCH", title: "Archived North Nazimabad Unit", city: "Karachi", loc: "North Nazimabad", type: "Apartment", beds: 2, size: "900 sqft", min: 1500000000, max: 1600000000 },
];

const listingIds: Record<string, string> = {};
const insertListing = db.prepare(
  `INSERT INTO listings (
    id, workspace_id, listing_ref, title, city, locality, property_type, beds, size_text,
    price_min_minor, price_max_minor, currency, public_url, description, status, created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
);
for (const L of listings) {
  const id = crypto.randomUUID();
  listingIds[L.ref] = id;
  const status = L.ref === "OLD-ARCH" ? "archived" : L.ref === "BAH-P8" ? "paused" : "active";
  insertListing.run(
    id, wsId, L.ref, L.title, L.city, L.loc, L.type, L.beds, L.size,
    L.min, L.max, "PKR", null, `Synthetic listing ${L.ref}`, status, iso(daysAgo(15)), iso(daysAgo(1))
  );
}

type Inq = {
  name: string; phone: string; source: string; stage: string; owner: string; listing?: string;
  locality?: string; min?: number; max?: number; follow?: Date | null; note?: string; lost?: string; email?: string;
};
const inqs: Inq[] = [
  { name: "Fatima Raza", phone: "923001112233", source: "whatsapp", stage: "new", owner: agentId, listing: "DHA-A1", locality: "DHA", min: 3000000000, max: 4000000000, follow: daysFrom(0, 15), note: "Asked about 3-bed facing park." },
  { name: "Omar Siddiqui", phone: "923334445566", source: "portal", stage: "contacted", owner: agentId, listing: "CLF-B2", locality: "Clifton", follow: daysFrom(-1, 11), note: "Brochure sent yesterday — overdue." },
  { name: "Sana Malik", phone: "923007778899", source: "meta_ads", stage: "visit_scheduled", owner: managerId, listing: "DHA-A1", follow: daysFrom(0, 9), note: "Visit booked for today." },
  { name: "Hassan Ali", phone: "923212223344", source: "referral", stage: "negotiation", owner: ownerId, listing: "GUL-H5", min: 5000000000, max: 6000000000, follow: daysFrom(1, 12), note: "Discussing token amount." },
  { name: "Nadia Khan", phone: "923009998877", source: "phone", stage: "won", owner: agentId, listing: "CLF-B2", note: "Deal closed — synthetic win." },
  { name: "Imran Qureshi", phone: "923451112222", source: "walk_in", stage: "lost", owner: managerId, listing: "BAH-P8", lost: "budget", note: "Budget too low for Bahria plot." },
  { name: "Zainab Hussain", phone: "923003334455", source: "whatsapp", stage: "new", owner: agentId, listing: "PECHS-C3", follow: daysFrom(2, 10), note: "Commercial interest." },
  { name: "Tariq Mehmood", phone: "923224445566", source: "other", stage: "contacted", owner: ownerId, locality: "PECHS", follow: daysFrom(0, 16), note: "Wants shop near Tariq Road." },
  { name: "Ayesha Noor", phone: "923015556667", source: "portal", stage: "visit_scheduled", owner: agentId, listing: "GUL-H5", follow: daysFrom(3, 11), note: "Visit next week." },
  { name: "Kamran Shah", phone: "923336667778", source: "referral", stage: "negotiation", owner: managerId, listing: "DHA-A1", follow: daysFrom(-2, 14), note: "Waiting on spouse decision — overdue." },
  { name: "Rabia Ahmed", phone: "923018889990", source: "meta_ads", stage: "new", owner: agentId, listing: "CLF-B2", email: "rabia@example.com", follow: daysFrom(1, 9) },
  { name: "Faisal Iqbal", phone: "923209991112", source: "whatsapp", stage: "contacted", owner: agentId, locality: "Bahria", follow: daysFrom(0, 18) },
];

const insertInq = db.prepare(
  `INSERT INTO inquiries (
    id, workspace_id, listing_id, owner_id, created_by, name, phone, email, source, source_detail,
    external_ref, property_type, preferred_locality, budget_min_minor, budget_max_minor, currency,
    bedrooms, message, stage, next_follow_up_at, lost_reason, created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
);
const insertNote = db.prepare(
  `INSERT INTO inquiry_notes (id, inquiry_id, user_id, body, template_key, created_at) VALUES (?,?,?,?,null,?)`
);
const insertEvent = db.prepare(
  `INSERT INTO inquiry_events (id, workspace_id, inquiry_id, user_id, event_type, metadata_json, created_at) VALUES (?,?,?,?,?,?,?)`
);
const insertVisit = db.prepare(
  `INSERT INTO inquiry_visits (id, inquiry_id, scheduled_at, status, outcome_note, created_by, updated_at) VALUES (?,?,?,?,?,?,?)`
);

const inquiryIds: string[] = [];
for (const row of inqs) {
  const id = crypto.randomUUID();
  inquiryIds.push(id);
  const listingId = row.listing ? listingIds[row.listing] : null;
  insertInq.run(
    id, wsId, listingId, row.owner, ownerId, row.name, row.phone, row.email || null,
    row.source, row.source === "portal" ? "Zameen" : null, null, null, row.locality || null,
    row.min ?? null, row.max ?? null, "PKR", null, row.note || null, row.stage,
    row.follow ? iso(row.follow) : null, row.lost || null, iso(daysAgo(5)), iso(daysAgo(0))
  );
  insertEvent.run(crypto.randomUUID(), wsId, id, ownerId, "created", "{}", iso(daysAgo(5)));
  if (row.note) {
    insertNote.run(crypto.randomUUID(), id, row.owner, row.note, iso(daysAgo(1)));
  }
}

// Visit today for Sana (index 2), scheduled
insertVisit.run(
  crypto.randomUUID(), inquiryIds[2], iso(daysFrom(0, 17)), "scheduled", null, managerId, iso(now)
);
insertEvent.run(crypto.randomUUID(), wsId, inquiryIds[2], managerId, "visit_scheduled", JSON.stringify({ when: "today" }), iso(daysAgo(1)));

// Future visit for Ayesha Noor
insertVisit.run(
  crypto.randomUUID(), inquiryIds[8], iso(daysFrom(3, 11)), "scheduled", null, agentId, iso(now)
);

console.log("Seeded ListingLoop Desk");
console.log("  DB:", dbPath);
console.log("  Workspace: Karachi Homes Demo");
console.log("  owner@listingloop.local / owner123");
console.log("  manager@listingloop.local / manager123");
console.log("  agent@listingloop.local / agent123");
console.log(`  Listings: ${listings.length}, Inquiries: ${inqs.length}`);
db.close();
