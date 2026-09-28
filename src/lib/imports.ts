import Papa from "papaparse";
import { getDb } from "./db";
import { AuthError } from "./auth";
import { preparePhoneForStorage } from "./phone";
import { parseMoneyToMinor } from "./format";
import { getListingByRef } from "./listings";
import {
  findByExternalRef,
  findByPhone,
  recordEvent,
} from "./inquiries";
import type {
  ImportJob,
  ImportRowOutcome,
  MapTarget,
  SessionUser,
} from "./types";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, SOURCES } from "./types";

const AUTO_MAP: Record<string, MapTarget> = {
  name: "name",
  full_name: "name",
  fullname: "name",
  phone: "phone",
  mobile: "phone",
  phone_number: "phone",
  email: "email",
  source: "source",
  source_detail: "source_detail",
  campaign: "source_detail",
  listing_ref: "listing_ref",
  listing: "listing_ref",
  project: "listing_ref",
  locality: "locality",
  preferred_locality: "locality",
  city: "locality",
  budget_min: "budget_min",
  budget_max: "budget_max",
  currency: "currency",
  message: "message",
  notes: "message",
  external_ref: "external_ref",
  meta_lead_id: "external_ref",
  lead_id: "external_ref",
  created_at: "created_at",
  created_time: "created_at",
};

export function suggestMapping(headers: string[]): Record<string, MapTarget> {
  const mapping: Record<string, MapTarget> = {};
  for (const h of headers) {
    const key = h.trim().toLowerCase().replace(/\s+/g, "_");
    mapping[h] = AUTO_MAP[key] || "ignore";
  }
  return mapping;
}

export function parseCsvText(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  if (Buffer.byteLength(text, "utf8") > MAX_IMPORT_BYTES) {
    throw new AuthError("CSV file too large (max 2MB)", 400);
  }
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  if (parsed.errors.length && !parsed.data.length) {
    throw new AuthError(
      `CSV parse error: ${parsed.errors[0]?.message || "unknown"}`,
      400
    );
  }
  return {
    headers: parsed.meta.fields || [],
    rows: parsed.data.slice(0, MAX_IMPORT_ROWS),
  };
}

export function createImportJob(
  user: SessionUser,
  filename: string,
  text: string
): ImportJob {
  const { headers, rows } = parseCsvText(text);
  if (!headers.length) throw new AuthError("CSV has no headers", 400);
  if (!rows.length) throw new AuthError("CSV has no data rows", 400);
  const mapping = suggestMapping(headers);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO import_jobs (
        id, workspace_id, uploaded_by, filename, mapping_json, headers_json,
        sample_rows_json, rows_json, row_count, status, default_owner_id, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      user.workspace_id,
      user.id,
      filename.slice(0, 200),
      JSON.stringify(mapping),
      JSON.stringify(headers),
      JSON.stringify(rows.slice(0, 5)),
      JSON.stringify(rows),
      rows.length,
      "uploaded",
      user.id,
      now
    );
  return getImportJob(user, id)!;
}

export function getImportJob(user: SessionUser, id: string): ImportJob | null {
  const row = getDb()
    .prepare(`SELECT * FROM import_jobs WHERE id = ? AND workspace_id = ?`)
    .get(id, user.workspace_id) as ImportJob | undefined;
  return row ?? null;
}

export function listImportJobs(user: SessionUser): ImportJob[] {
  return getDb()
    .prepare(
      `SELECT * FROM import_jobs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .all(user.workspace_id) as ImportJob[];
}

export function updateMapping(
  user: SessionUser,
  jobId: string,
  mapping: Record<string, MapTarget>,
  defaultOwnerId?: string
): ImportJob {
  const job = getImportJob(user, jobId);
  if (!job) throw new AuthError("Import job not found", 404);
  if (job.status === "done" || job.status === "committing") {
    throw new AuthError("Import already committed", 400);
  }
  const values = Object.values(mapping);
  if (!values.includes("name") || !values.includes("phone")) {
    throw new AuthError("Mapping must include name and phone", 400);
  }
  if (defaultOwnerId) {
    const m = getDb()
      .prepare(
        `SELECT id FROM memberships WHERE workspace_id = ? AND user_id = ? AND status = 'active'`
      )
      .get(user.workspace_id, defaultOwnerId);
    if (!m) throw new AuthError("Default owner not in workspace", 400);
  }
  getDb()
    .prepare(
      `UPDATE import_jobs SET mapping_json = ?, default_owner_id = ?, status = 'mapped' WHERE id = ?`
    )
    .run(
      JSON.stringify(mapping),
      defaultOwnerId || job.default_owner_id || user.id,
      jobId
    );
  return getImportJob(user, jobId)!;
}

type MappedRow = {
  row_number: number;
  name: string | null;
  phone_raw: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  source_detail: string | null;
  listing_ref: string | null;
  locality: string | null;
  budget_min_minor: number | null;
  budget_max_minor: number | null;
  currency: string;
  message: string | null;
  external_ref: string | null;
  created_at: string | null;
};

function mapRow(
  raw: Record<string, string>,
  mapping: Record<string, MapTarget>,
  rowNumber: number,
  defaultCurrency: string
): MappedRow {
  const get = (target: MapTarget): string | null => {
    for (const [header, t] of Object.entries(mapping)) {
      if (t === target && raw[header] != null && String(raw[header]).trim()) {
        return String(raw[header]).trim();
      }
    }
    return null;
  };
  const phoneRaw = get("phone");
  const phone = phoneRaw ? preparePhoneForStorage(phoneRaw) : null;
  let source = (get("source") || "other").toLowerCase().replace(/\s+/g, "_");
  if (!(SOURCES as readonly string[]).includes(source)) source = "other";
  return {
    row_number: rowNumber,
    name: get("name"),
    phone_raw: phoneRaw,
    phone,
    email: get("email"),
    source,
    source_detail: get("source_detail"),
    listing_ref: get("listing_ref"),
    locality: get("locality"),
    budget_min_minor: parseMoneyToMinor(get("budget_min")),
    budget_max_minor: parseMoneyToMinor(get("budget_max")),
    currency: get("currency") || defaultCurrency,
    message: get("message"),
    external_ref: get("external_ref"),
    created_at: get("created_at"),
  };
}

export type PreviewResult = {
  would_create: number;
  would_duplicate: number;
  would_invalid: number;
  samples: {
    row_number: number;
    name: string | null;
    phone: string | null;
    outcome: ImportRowOutcome;
    message: string | null;
  }[];
};

export function previewImport(user: SessionUser, jobId: string): PreviewResult {
  const job = getImportJob(user, jobId);
  if (!job) throw new AuthError("Import job not found", 404);
  const mapping = JSON.parse(job.mapping_json) as Record<string, MapTarget>;
  if (
    !Object.values(mapping).includes("name") ||
    !Object.values(mapping).includes("phone")
  ) {
    throw new AuthError("Mapping must include name and phone", 400);
  }
  const full = getDb()
    .prepare(`SELECT rows_json FROM import_jobs WHERE id = ?`)
    .get(jobId) as { rows_json: string };
  const rows = JSON.parse(full.rows_json || "[]") as Record<string, string>[];
  const ws = getDb()
    .prepare(`SELECT default_currency FROM workspaces WHERE id = ?`)
    .get(user.workspace_id) as { default_currency: string };

  const seenPhones = new Set<string>();
  const seenExt = new Set<string>();
  let would_create = 0;
  let would_duplicate = 0;
  let would_invalid = 0;
  const samples: PreviewResult["samples"] = [];

  rows.forEach((raw, idx) => {
    const mapped = mapRow(raw, mapping, idx + 2, ws.default_currency);
    let outcome: ImportRowOutcome = "created";
    let message: string | null = null;
    if (!mapped.name || !mapped.phone) {
      outcome = "invalid";
      message = !mapped.name ? "Missing name" : "Invalid phone";
      would_invalid++;
    } else if (
      seenPhones.has(mapped.phone) ||
      findByPhone(user.workspace_id, mapped.phone)
    ) {
      outcome = "duplicate";
      message = "Duplicate phone";
      would_duplicate++;
    } else if (
      mapped.external_ref &&
      (seenExt.has(mapped.external_ref) ||
        findByExternalRef(user.workspace_id, mapped.external_ref))
    ) {
      outcome = "duplicate";
      message = "Duplicate external_ref";
      would_duplicate++;
    } else {
      would_create++;
      seenPhones.add(mapped.phone);
      if (mapped.external_ref) seenExt.add(mapped.external_ref);
    }
    if (samples.length < 20) {
      samples.push({
        row_number: mapped.row_number,
        name: mapped.name,
        phone: mapped.phone,
        outcome,
        message,
      });
    }
  });

  getDb()
    .prepare(`UPDATE import_jobs SET status = 'previewed' WHERE id = ?`)
    .run(jobId);
  return { would_create, would_duplicate, would_invalid, samples };
}

export function commitImport(user: SessionUser, jobId: string): ImportJob {
  const job = getImportJob(user, jobId);
  if (!job) throw new AuthError("Import job not found", 404);
  if (job.status === "done") return job;
  if (job.status === "committing") {
    throw new AuthError("Import already committing", 400);
  }
  const mapping = JSON.parse(job.mapping_json) as Record<string, MapTarget>;
  if (
    !Object.values(mapping).includes("name") ||
    !Object.values(mapping).includes("phone")
  ) {
    throw new AuthError("Mapping must include name and phone", 400);
  }

  const db = getDb();
  db.prepare(`UPDATE import_jobs SET status = 'committing' WHERE id = ?`).run(
    jobId
  );

  const full = db
    .prepare(`SELECT rows_json FROM import_jobs WHERE id = ?`)
    .get(jobId) as { rows_json: string };
  const rows = JSON.parse(full.rows_json || "[]") as Record<string, string>[];
  const ws = db
    .prepare(`SELECT default_currency FROM workspaces WHERE id = ?`)
    .get(user.workspace_id) as { default_currency: string };
  const ownerId = job.default_owner_id || user.id;

  let created = 0;
  let duplicate = 0;
  let invalid = 0;
  let errors = 0;
  const seenPhones = new Set<string>();
  const seenExt = new Set<string>();

  const insertInquiry = db.prepare(
    `INSERT INTO inquiries (
      id, workspace_id, listing_id, owner_id, created_by, name, phone, email,
      source, source_detail, external_ref, property_type, preferred_locality,
      budget_min_minor, budget_max_minor, currency, bedrooms, message,
      stage, next_follow_up_at, lost_reason, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insertRow = db.prepare(
    `INSERT INTO import_job_rows
      (id, job_id, row_number, outcome, phone_raw, phone_normalized, inquiry_id, message)
     VALUES (?,?,?,?,?,?,?,?)`
  );

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM import_job_rows WHERE job_id = ?`).run(jobId);
    for (let idx = 0; idx < rows.length; idx++) {
      const mapped = mapRow(rows[idx], mapping, idx + 2, ws.default_currency);
      const rowId = crypto.randomUUID();
      try {
        if (!mapped.name || !mapped.phone) {
          invalid++;
          insertRow.run(
            rowId,
            jobId,
            mapped.row_number,
            "invalid",
            mapped.phone_raw,
            mapped.phone,
            null,
            !mapped.name ? "Missing name" : "Invalid phone"
          );
          continue;
        }
        if (
          seenPhones.has(mapped.phone) ||
          findByPhone(user.workspace_id, mapped.phone)
        ) {
          duplicate++;
          insertRow.run(
            rowId,
            jobId,
            mapped.row_number,
            "duplicate",
            mapped.phone_raw,
            mapped.phone,
            null,
            "Duplicate phone"
          );
          continue;
        }
        if (
          mapped.external_ref &&
          (seenExt.has(mapped.external_ref) ||
            findByExternalRef(user.workspace_id, mapped.external_ref))
        ) {
          duplicate++;
          insertRow.run(
            rowId,
            jobId,
            mapped.row_number,
            "duplicate",
            mapped.phone_raw,
            mapped.phone,
            null,
            "Duplicate external_ref"
          );
          continue;
        }

        let listingId: string | null = null;
        if (mapped.listing_ref) {
          const listing = getListingByRef(
            user.workspace_id,
            mapped.listing_ref
          );
          if (listing && listing.status !== "archived") {
            listingId = listing.id;
          }
        }

        const inquiryId = crypto.randomUUID();
        const now = new Date().toISOString();
        let createdAt = now;
        if (mapped.created_at) {
          const d = new Date(mapped.created_at);
          if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
        }

        insertInquiry.run(
          inquiryId,
          user.workspace_id,
          listingId,
          ownerId,
          user.id,
          mapped.name,
          mapped.phone,
          mapped.email,
          mapped.source,
          mapped.source_detail,
          mapped.external_ref,
          null,
          mapped.locality,
          mapped.budget_min_minor,
          mapped.budget_max_minor,
          mapped.currency,
          null,
          mapped.message,
          "new",
          null,
          null,
          createdAt,
          now
        );
        recordEvent(user.workspace_id, inquiryId, user.id, "created", {
          via: "csv_import",
          job_id: jobId,
        });
        created++;
        seenPhones.add(mapped.phone);
        if (mapped.external_ref) seenExt.add(mapped.external_ref);
        insertRow.run(
          rowId,
          jobId,
          mapped.row_number,
          "created",
          mapped.phone_raw,
          mapped.phone,
          inquiryId,
          null
        );
      } catch (e) {
        errors++;
        insertRow.run(
          rowId,
          jobId,
          mapped.row_number,
          "error",
          mapped.phone_raw,
          mapped.phone,
          null,
          String(e).slice(0, 200)
        );
      }
    }
    db.prepare(
      `UPDATE import_jobs SET
        status = 'done', created_count = ?, duplicate_count = ?,
        invalid_count = ?, error_count = ?, finished_at = ?, rows_json = NULL
       WHERE id = ?`
    ).run(
      created,
      duplicate,
      invalid,
      errors,
      new Date().toISOString(),
      jobId
    );
  });

  try {
    tx();
  } catch (e) {
    db.prepare(`UPDATE import_jobs SET status = 'failed' WHERE id = ?`).run(
      jobId
    );
    throw e;
  }
  return getImportJob(user, jobId)!;
}

export function getImportReportRows(user: SessionUser, jobId: string): {
  id: string;
  row_number: number;
  outcome: string;
  phone_raw: string | null;
  phone_normalized: string | null;
  inquiry_id: string | null;
  message: string | null;
}[] {

  const job = getImportJob(user, jobId);
  if (!job) throw new AuthError("Import job not found", 404);
  return getDb()
    .prepare(
      `SELECT * FROM import_job_rows WHERE job_id = ? ORDER BY row_number ASC`
    )
    .all(jobId) as {
      id: string;
      row_number: number;
      outcome: string;
      phone_raw: string | null;
      phone_normalized: string | null;
      inquiry_id: string | null;
      message: string | null;
    }[];
}

/** Soft re-upload nudge: constant days since last successful commit (no settings UI). */
export const IMPORT_CADENCE_DAYS = 3;

export type ImportCadenceState = {
  show: boolean;
  lastSuccessfulAt: string | null;
};

/**
 * Manager/owner only at call site.
 * Show when: (a) ≥1 successful (`done`) commit and newest `created_at` older than N days,
 * or (b) jobs exist but none succeeded (e.g. only failed). Empty jobs → no banner (empty CTA).
 */
export function getImportCadenceState(user: SessionUser): ImportCadenceState {
  const jobs = getDb()
    .prepare(
      `SELECT status, created_at FROM import_jobs WHERE workspace_id = ?`
    )
    .all(user.workspace_id) as { status: string; created_at: string }[];
  if (jobs.length === 0) {
    return { show: false, lastSuccessfulAt: null };
  }
  const successful = jobs
    .filter((j) => j.status === "done")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (successful.length === 0) {
    return { show: true, lastSuccessfulAt: null };
  }
  const newest = successful[0];
  const ageMs = Date.now() - new Date(newest.created_at).getTime();
  const threshold = IMPORT_CADENCE_DAYS * 24 * 60 * 60 * 1000;
  return {
    show: ageMs >= threshold,
    lastSuccessfulAt: newest.created_at,
  };
}
