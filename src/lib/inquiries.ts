import { getDb } from "./db";
import {
  AuthError,
  assertMemberInWorkspace,
  isManagerOrOwner,
} from "./auth";
import { preparePhoneForStorage, PHONE_REQUIRED_HINT } from "./phone";
import { createListing } from "./listings";
import { endOfDayISO, startOfDayISO } from "./format";
import type {
  Inquiry,
  InquiryEvent,
  InquiryNote,
  InquirySource,
  InquiryVisit,
  SessionUser,
  Stage,
  VisitStatus,
} from "./types";
import { MAX_NOTE_LENGTH, OPEN_STAGES, SOURCES, STAGES } from "./types";

const SELECT = `
  SELECT i.*,
    u.name as owner_name,
    l.listing_ref as listing_ref,
    l.title as listing_title,
    COALESCE(l.locality, l.city) as listing_locality
  FROM inquiries i
  JOIN users u ON u.id = i.owner_id
  LEFT JOIN listings l ON l.id = i.listing_id
`;

function canSee(user: SessionUser, inquiry: Inquiry): boolean {
  if (isManagerOrOwner(user.role)) return true;
  return inquiry.owner_id === user.id;
}

function loadInquiry(user: SessionUser, id: string): Inquiry {
  const row = getDb()
    .prepare(`${SELECT} WHERE i.id = ? AND i.workspace_id = ?`)
    .get(id, user.workspace_id) as Inquiry | undefined;
  if (!row) throw new AuthError("Inquiry not found", 404);
  if (!canSee(user, row)) throw new AuthError("Forbidden", 403);
  return row;
}

export function getInquiry(user: SessionUser, id: string): Inquiry {
  return loadInquiry(user, id);
}

export type InquiryFilters = {
  listing_id?: string;
  owner_id?: string;
  source?: string;
  stage?: string;
  locality?: string;
  q?: string;
};

export function listInquiries(
  user: SessionUser,
  filters: InquiryFilters = {}
): Inquiry[] {
  const params: string[] = [user.workspace_id];
  let sql = `${SELECT} WHERE i.workspace_id = ?`;
  if (!isManagerOrOwner(user.role)) {
    sql += " AND i.owner_id = ?";
    params.push(user.id);
  }
  if (filters.listing_id) {
    sql += " AND i.listing_id = ?";
    params.push(filters.listing_id);
  }
  if (filters.owner_id && isManagerOrOwner(user.role)) {
    sql += " AND i.owner_id = ?";
    params.push(filters.owner_id);
  }
  if (filters.source) {
    sql += " AND i.source = ?";
    params.push(filters.source);
  }
  if (filters.stage) {
    sql += " AND i.stage = ?";
    params.push(filters.stage);
  }
  if (filters.locality) {
    const like = `%${filters.locality}%`;
    sql +=
      " AND (IFNULL(i.preferred_locality,'') LIKE ? OR IFNULL(l.locality,'') LIKE ? OR IFNULL(l.city,'') LIKE ?)";
    params.push(like, like, like);
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    sql +=
      " AND (i.name LIKE ? OR i.phone LIKE ? OR IFNULL(l.listing_ref,'') LIKE ? OR IFNULL(i.source_detail,'') LIKE ?)";
    params.push(like, like, like, like);
  }
  sql += " ORDER BY i.updated_at DESC";
  return getDb().prepare(sql).all(...params) as Inquiry[];
}

export function recordEvent(
  workspaceId: string,
  inquiryId: string | null,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  getDb()
    .prepare(
      `INSERT INTO inquiry_events
        (id, workspace_id, inquiry_id, user_id, event_type, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      crypto.randomUUID(),
      workspaceId,
      inquiryId,
      userId,
      eventType,
      JSON.stringify(metadata),
      new Date().toISOString()
    );
}

function validateSource(source: string): InquirySource {
  if (!SOURCES.includes(source as InquirySource)) {
    throw new AuthError(`Invalid source: ${source}`, 400);
  }
  return source as InquirySource;
}

function validateStage(stage: string): Stage {
  if (!STAGES.includes(stage as Stage)) {
    throw new AuthError(`Invalid stage: ${stage}`, 400);
  }
  return stage as Stage;
}

function assertListing(workspaceId: string, listingId: string | null | undefined) {
  if (!listingId) return;
  const row = getDb()
    .prepare(`SELECT id, status FROM listings WHERE id = ? AND workspace_id = ?`)
    .get(listingId, workspaceId) as { id: string; status: string } | undefined;
  if (!row) throw new AuthError("Listing not found in workspace", 400);
}

export type InquiryInput = {
  name: string;
  phone: string;
  source: string;
  owner_id: string;
  listing_id?: string | null;
  email?: string | null;
  source_detail?: string | null;
  external_ref?: string | null;
  property_type?: string | null;
  preferred_locality?: string | null;
  budget_min_minor?: number | null;
  budget_max_minor?: number | null;
  currency?: string;
  bedrooms?: number | null;
  message?: string | null;
  stage?: Stage;
  next_follow_up_at?: string | null;
  lost_reason?: string | null;
};

export function createInquiry(user: SessionUser, input: InquiryInput): Inquiry {
  const name = String(input.name || "").trim();
  if (!name) throw new AuthError("Name is required", 400);
  const phone = preparePhoneForStorage(input.phone);
  if (!phone) throw new AuthError(PHONE_REQUIRED_HINT, 400);
  const source = validateSource(String(input.source || "").trim());
  const ownerId = String(input.owner_id || "").trim();
  if (!ownerId) throw new AuthError("Owner is required", 400);
  assertMemberInWorkspace(user.workspace_id, ownerId);
  if (!isManagerOrOwner(user.role) && ownerId !== user.id) {
    throw new AuthError("Agents can only assign inquiries to themselves", 403);
  }
  const listingId = input.listing_id || null;
  if (listingId) {
    assertListing(user.workspace_id, listingId);
    const listing = getDb()
      .prepare(`SELECT status FROM listings WHERE id = ?`)
      .get(listingId) as { status: string };
    if (listing.status === "archived") {
      throw new AuthError(
        "Archived listings cannot be selected for new inquiries",
        400
      );
    }
  }
  const stage = validateStage(input.stage || "new");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO inquiries (
        id, workspace_id, listing_id, owner_id, created_by, name, phone, email,
        source, source_detail, external_ref, property_type, preferred_locality,
        budget_min_minor, budget_max_minor, currency, bedrooms, message,
        stage, next_follow_up_at, lost_reason, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      id,
      user.workspace_id,
      listingId,
      ownerId,
      user.id,
      name,
      phone,
      input.email?.trim() || null,
      source,
      input.source_detail?.trim() || null,
      input.external_ref?.trim() || null,
      input.property_type?.trim() || null,
      input.preferred_locality?.trim() || null,
      input.budget_min_minor ?? null,
      input.budget_max_minor ?? null,
      input.currency || "PKR",
      input.bedrooms ?? null,
      input.message?.trim() || null,
      stage,
      input.next_follow_up_at || null,
      input.lost_reason?.trim() || null,
      now,
      now
    );
  recordEvent(user.workspace_id, id, user.id, "created", {
    stage,
    owner_id: ownerId,
    listing_id: listingId,
  });
  return getInquiry(user, id);
}

export function updateInquiry(
  user: SessionUser,
  id: string,
  input: Partial<InquiryInput> & { visit_scheduled_at?: string | null }
): Inquiry {
  const existing = loadInquiry(user, id);
  const db = getDb();

  let phone = existing.phone;
  if (input.phone != null) {
    const prepared = preparePhoneForStorage(input.phone);
    if (!prepared) throw new AuthError(PHONE_REQUIRED_HINT, 400);
    phone = prepared;
  }

  let ownerId = existing.owner_id;
  if (input.owner_id != null && input.owner_id !== existing.owner_id) {
    if (!isManagerOrOwner(user.role)) {
      throw new AuthError("Only owners/managers can reassign", 403);
    }
    assertMemberInWorkspace(user.workspace_id, input.owner_id);
    ownerId = input.owner_id;
  }

  let listingId =
    input.listing_id !== undefined ? input.listing_id : existing.listing_id;
  if (listingId) assertListing(user.workspace_id, listingId);

  let stage = existing.stage;
  if (input.stage != null && input.stage !== existing.stage) {
    stage = validateStage(input.stage);
    if (stage === "visit_scheduled") {
      const visitAt = input.visit_scheduled_at;
      if (!visitAt) {
        throw new AuthError(
          "Visit date/time is required when stage becomes visit_scheduled",
          400
        );
      }
      createVisit(user, id, visitAt, false);
    }
  }

  const name =
    input.name != null ? String(input.name).trim() : existing.name;
  if (!name) throw new AuthError("Name is required", 400);
  const source =
    input.source != null
      ? validateSource(String(input.source).trim())
      : existing.source;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE inquiries SET
      listing_id=?, owner_id=?, name=?, phone=?, email=?,
      source=?, source_detail=?, external_ref=?, property_type=?,
      preferred_locality=?, budget_min_minor=?, budget_max_minor=?,
      currency=?, bedrooms=?, message=?, stage=?,
      next_follow_up_at=?, lost_reason=?, updated_at=?
     WHERE id=? AND workspace_id=?`
  ).run(
    listingId,
    ownerId,
    name,
    phone,
    input.email !== undefined ? input.email?.trim() || null : existing.email,
    source,
    input.source_detail !== undefined
      ? input.source_detail?.trim() || null
      : existing.source_detail,
    input.external_ref !== undefined
      ? input.external_ref?.trim() || null
      : existing.external_ref,
    input.property_type !== undefined
      ? input.property_type?.trim() || null
      : existing.property_type,
    input.preferred_locality !== undefined
      ? input.preferred_locality?.trim() || null
      : existing.preferred_locality,
    input.budget_min_minor !== undefined
      ? input.budget_min_minor
      : existing.budget_min_minor,
    input.budget_max_minor !== undefined
      ? input.budget_max_minor
      : existing.budget_max_minor,
    input.currency || existing.currency,
    input.bedrooms !== undefined ? input.bedrooms : existing.bedrooms,
    input.message !== undefined
      ? input.message?.trim() || null
      : existing.message,
    stage,
    input.next_follow_up_at !== undefined
      ? input.next_follow_up_at || null
      : existing.next_follow_up_at,
    input.lost_reason !== undefined
      ? input.lost_reason?.trim() || null
      : existing.lost_reason,
    now,
    id,
    user.workspace_id
  );

  if (stage !== existing.stage) {
    recordEvent(user.workspace_id, id, user.id, "stage_changed", {
      from: existing.stage,
      to: stage,
    });
  }
  if (ownerId !== existing.owner_id) {
    recordEvent(user.workspace_id, id, user.id, "assigned", {
      from: existing.owner_id,
      to: ownerId,
    });
  }
  if (
    input.next_follow_up_at !== undefined &&
    input.next_follow_up_at !== existing.next_follow_up_at
  ) {
    recordEvent(user.workspace_id, id, user.id, "follow_up_updated", {
      next_follow_up_at: input.next_follow_up_at,
    });
  }
  return getInquiry(user, id);
}

export function moveStage(
  user: SessionUser,
  id: string,
  stage: Stage,
  opts: { visit_scheduled_at?: string; lost_reason?: string } = {}
): Inquiry {
  return updateInquiry(user, id, {
    stage,
    visit_scheduled_at: opts.visit_scheduled_at,
    lost_reason: opts.lost_reason,
  });
}

export function addNote(
  user: SessionUser,
  inquiryId: string,
  body: string,
  templateKey?: string | null
): InquiryNote {
  const inquiry = loadInquiry(user, inquiryId);
  const text = String(body || "").trim();
  if (!text) throw new AuthError("Note body is required", 400);
  if (text.length > MAX_NOTE_LENGTH) {
    throw new AuthError(`Note max length is ${MAX_NOTE_LENGTH}`, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO inquiry_notes (id, inquiry_id, user_id, body, template_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, inquiry.id, user.id, text, templateKey || null, now);
  recordEvent(user.workspace_id, inquiry.id, user.id, "note_added", {
    note_id: id,
    template_key: templateKey || null,
  });
  return getDb()
    .prepare(
      `SELECT n.*, u.name as user_name FROM inquiry_notes n
       JOIN users u ON u.id = n.user_id WHERE n.id = ?`
    )
    .get(id) as InquiryNote;
}

export function listNotes(user: SessionUser, inquiryId: string): InquiryNote[] {
  loadInquiry(user, inquiryId);
  return getDb()
    .prepare(
      `SELECT n.*, u.name as user_name FROM inquiry_notes n
       JOIN users u ON u.id = n.user_id
       WHERE n.inquiry_id = ? ORDER BY n.created_at DESC`
    )
    .all(inquiryId) as InquiryNote[];
}

export function listEvents(
  user: SessionUser,
  inquiryId: string
): InquiryEvent[] {
  loadInquiry(user, inquiryId);
  return getDb()
    .prepare(
      `SELECT e.*, u.name as user_name FROM inquiry_events e
       JOIN users u ON u.id = e.user_id
       WHERE e.inquiry_id = ? AND e.workspace_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(inquiryId, user.workspace_id) as InquiryEvent[];
}

export function createVisit(
  user: SessionUser,
  inquiryId: string,
  scheduledAt: string,
  setStage = true
): InquiryVisit {
  const inquiry = loadInquiry(user, inquiryId);
  const at = new Date(scheduledAt);
  if (Number.isNaN(at.getTime())) {
    throw new AuthError("Invalid visit date/time", 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `INSERT INTO inquiry_visits
      (id, inquiry_id, scheduled_at, status, outcome_note, created_by, updated_at)
     VALUES (?, ?, ?, 'scheduled', null, ?, ?)`
  ).run(id, inquiry.id, at.toISOString(), user.id, now);

  if (setStage && inquiry.stage !== "visit_scheduled") {
    db.prepare(
      `UPDATE inquiries SET stage = 'visit_scheduled', updated_at = ?
       WHERE id = ? AND workspace_id = ?`
    ).run(now, inquiry.id, user.workspace_id);
    recordEvent(user.workspace_id, inquiry.id, user.id, "stage_changed", {
      from: inquiry.stage,
      to: "visit_scheduled",
    });
  }
  recordEvent(user.workspace_id, inquiry.id, user.id, "visit_scheduled", {
    visit_id: id,
    scheduled_at: at.toISOString(),
  });
  return db
    .prepare(`SELECT * FROM inquiry_visits WHERE id = ?`)
    .get(id) as InquiryVisit;
}

export function updateVisit(
  user: SessionUser,
  visitId: string,
  patch: {
    status?: VisitStatus;
    scheduled_at?: string;
    outcome_note?: string | null;
  }
): InquiryVisit {
  const db = getDb();
  const visit = db
    .prepare(
      `SELECT v.*, i.workspace_id, i.owner_id, i.id as inq_id
       FROM inquiry_visits v
       JOIN inquiries i ON i.id = v.inquiry_id
       WHERE v.id = ?`
    )
    .get(visitId) as
    | (InquiryVisit & {
        workspace_id: string;
        owner_id: string;
        inq_id: string;
      })
    | undefined;
  if (!visit || visit.workspace_id !== user.workspace_id) {
    throw new AuthError("Visit not found", 404);
  }
  if (!isManagerOrOwner(user.role) && visit.owner_id !== user.id) {
    throw new AuthError("Forbidden", 403);
  }
  const status = patch.status || visit.status;
  const scheduledAt = patch.scheduled_at
    ? new Date(patch.scheduled_at).toISOString()
    : visit.scheduled_at;
  const outcome =
    patch.outcome_note !== undefined ? patch.outcome_note : visit.outcome_note;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE inquiry_visits SET status=?, scheduled_at=?, outcome_note=?, updated_at=?
     WHERE id=?`
  ).run(status, scheduledAt, outcome, now, visitId);
  recordEvent(user.workspace_id, visit.inq_id, user.id, "visit_updated", {
    visit_id: visitId,
    status,
    scheduled_at: scheduledAt,
  });
  return db
    .prepare(`SELECT * FROM inquiry_visits WHERE id = ?`)
    .get(visitId) as InquiryVisit;
}

export function listVisitsForInquiry(
  user: SessionUser,
  inquiryId: string
): InquiryVisit[] {
  loadInquiry(user, inquiryId);
  return getDb()
    .prepare(
      `SELECT * FROM inquiry_visits WHERE inquiry_id = ? ORDER BY scheduled_at DESC`
    )
    .all(inquiryId) as InquiryVisit[];
}

export function listVisits(
  user: SessionUser,
  opts: { status?: VisitStatus; day?: "today" | "all" } = {}
): InquiryVisit[] {
  const params: string[] = [user.workspace_id];
  let sql = `
    SELECT v.*, i.name as inquiry_name, i.owner_id,
      l.title as listing_title, u.name as owner_name
    FROM inquiry_visits v
    JOIN inquiries i ON i.id = v.inquiry_id
    JOIN users u ON u.id = i.owner_id
    LEFT JOIN listings l ON l.id = i.listing_id
    WHERE i.workspace_id = ?
  `;
  if (!isManagerOrOwner(user.role)) {
    sql += " AND i.owner_id = ?";
    params.push(user.id);
  }
  if (opts.status) {
    sql += " AND v.status = ?";
    params.push(opts.status);
  }
  if (opts.day === "today") {
    sql += " AND v.scheduled_at >= ? AND v.scheduled_at <= ?";
    params.push(startOfDayISO(), endOfDayISO());
  }
  sql += " ORDER BY v.scheduled_at ASC";
  return getDb().prepare(sql).all(...params) as InquiryVisit[];
}

export type TodayQueue = {
  overdue: Inquiry[];
  due_today: Inquiry[];
  visits_today: InquiryVisit[];
};

export function getTodayQueue(user: SessionUser): TodayQueue {
  const params: string[] = [user.workspace_id];
  let ownerClause = "";
  if (!isManagerOrOwner(user.role)) {
    ownerClause = " AND i.owner_id = ?";
    params.push(user.id);
  }
  const openList = OPEN_STAGES.map((s) => `'${s}'`).join(",");
  const end = endOfDayISO();
  const start = startOfDayISO();
  const now = new Date().toISOString();
  const db = getDb();

  const overdue = db
    .prepare(
      `${SELECT}
       WHERE i.workspace_id = ? ${ownerClause}
         AND i.next_follow_up_at IS NOT NULL
         AND i.next_follow_up_at < ?
         AND i.stage IN (${openList})
       ORDER BY i.next_follow_up_at ASC`
    )
    .all(...params, now) as Inquiry[];

  const due_today = db
    .prepare(
      `${SELECT}
       WHERE i.workspace_id = ? ${ownerClause}
         AND i.next_follow_up_at IS NOT NULL
         AND i.next_follow_up_at >= ?
         AND i.next_follow_up_at <= ?
         AND i.stage IN (${openList})
       ORDER BY i.next_follow_up_at ASC`
    )
    .all(...params, start, end) as Inquiry[];

  const visits_today = listVisits(user, { day: "today", status: "scheduled" });
  return { overdue, due_today, visits_today };
}

export function getDashboardStats(user: SessionUser) {
  const queue = getTodayQueue(user);
  const params: string[] = [user.workspace_id];
  let ownerClause = "";
  if (!isManagerOrOwner(user.role)) {
    ownerClause = " AND owner_id = ?";
    params.push(user.id);
  }
  const counts = {} as Record<Stage, number>;
  for (const s of STAGES) counts[s] = 0;
  const rows = getDb()
    .prepare(
      `SELECT stage, COUNT(*) as c FROM inquiries
       WHERE workspace_id = ? ${ownerClause} GROUP BY stage`
    )
    .all(...params) as { stage: Stage; c: number }[];
  for (const r of rows) counts[r.stage] = r.c;
  const newRow = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM inquiries
       WHERE workspace_id = ? ${ownerClause} AND stage = 'new'`
    )
    .get(...params) as { c: number };
  const openTotal = OPEN_STAGES.reduce((sum, s) => sum + (counts[s] || 0), 0);
  return {
    overdue: queue.overdue.length,
    visits_today: queue.visits_today.length,
    new_count: newRow.c,
    due_today: queue.due_today.length,
    open_total: openTotal,
    counts,
  };
}

export function recordWaHandoff(
  user: SessionUser,
  inquiryId: string,
  templateKey?: string | null
) {
  const inquiry = loadInquiry(user, inquiryId);
  recordEvent(user.workspace_id, inquiry.id, user.id, "wa_handoff_intent", {
    template_key: templateKey || null,
  });
}

export function findByPhone(
  workspaceId: string,
  phone: string
): { id: string } | null {
  const row = getDb()
    .prepare(
      `SELECT id FROM inquiries WHERE workspace_id = ? AND phone = ? LIMIT 1`
    )
    .get(workspaceId, phone) as { id: string } | undefined;
  return row ?? null;
}

export function findByExternalRef(
  workspaceId: string,
  externalRef: string
): { id: string } | null {
  const row = getDb()
    .prepare(
      `SELECT id FROM inquiries WHERE workspace_id = ? AND external_ref = ? LIMIT 1`
    )
    .get(workspaceId, externalRef) as { id: string } | undefined;
  return row ?? null;
}

/** Manager/owner empty-state: one sample listing + inquiry with follow-up today. */
export function createSampleInquiry(user: SessionUser): {
  listing: { id: string; listing_ref: string; title: string };
  inquiry: Inquiry;
} {
  if (!isManagerOrOwner(user.role)) {
    throw new AuthError("Forbidden — owners/managers only", 403);
  }
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  const listing = createListing(user, {
    listing_ref: `SAMPLE-${suffix}`,
    title: "Sample Listing — DHA Phase 5 (Demo)",
    city: "Lahore",
    locality: "DHA Phase 5",
    property_type: "house",
    beds: 5,
    status: "active",
  });
  const followUp = new Date();
  followUp.setHours(11, 0, 0, 0);
  const phoneTail = String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
  const inquiry = createInquiry(user, {
    name: "Sample Inquiry (Demo)",
    phone: `92300${phoneTail}`,
    source: "other",
    source_detail: "sample_seed",
    owner_id: user.id,
    listing_id: listing.id,
    preferred_locality: "DHA Phase 5",
    stage: "new",
    next_follow_up_at: followUp.toISOString(),
    message:
      "Sample inquiry — pehli WhatsApp baat ke baad yahan note likho. / Write your first chat summary here.",
  });
  return {
    listing: {
      id: listing.id,
      listing_ref: listing.listing_ref,
      title: listing.title,
    },
    inquiry,
  };
}
