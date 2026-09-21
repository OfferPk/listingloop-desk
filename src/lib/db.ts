import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DEFAULT_PATH = path.join(process.cwd(), "data", "listingloop.db");

let dbInstance: Database.Database | null = null;

function resolveDbPath(): string {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return DEFAULT_PATH;
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  try {
    fs.chmodSync(dbPath, 0o600);
  } catch {
    /* ignore on unsupported FS */
  }
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  dbInstance = db;
  return db;
}

export function migrate(db: Database.Database) {
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

    CREATE INDEX IF NOT EXISTS idx_inq_ws_stage ON inquiries(workspace_id, stage);
    CREATE INDEX IF NOT EXISTS idx_inq_ws_owner_fu ON inquiries(workspace_id, owner_id, next_follow_up_at);
    CREATE INDEX IF NOT EXISTS idx_inq_ws_listing ON inquiries(workspace_id, listing_id);
    CREATE INDEX IF NOT EXISTS idx_inq_ws_phone ON inquiries(workspace_id, phone);
    CREATE INDEX IF NOT EXISTS idx_inq_ws_source ON inquiries(workspace_id, source);
    CREATE INDEX IF NOT EXISTS idx_listings_ws ON listings(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_visits_inq ON inquiry_visits(inquiry_id);
    CREATE INDEX IF NOT EXISTS idx_visits_at ON inquiry_visits(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_notes_inq ON inquiry_notes(inquiry_id);
    CREATE INDEX IF NOT EXISTS idx_events_inq ON inquiry_events(inquiry_id);
    CREATE INDEX IF NOT EXISTS idx_import_rows_job ON import_job_rows(job_id);
  `);
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
