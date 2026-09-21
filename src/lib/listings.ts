import { getDb } from "./db";
import { AuthError, isManagerOrOwner } from "./auth";
import type { Listing, ListingStatus, SessionUser } from "./types";

export function listListings(
  user: SessionUser,
  opts: { status?: ListingStatus | "all"; q?: string } = {}
): Listing[] {
  const db = getDb();
  const params: (string | number)[] = [user.workspace_id];
  let sql = `SELECT l.*,
    (SELECT COUNT(*) FROM inquiries i WHERE i.listing_id = l.id) as inquiry_count
    FROM listings l WHERE l.workspace_id = ?`;
  if (opts.status && opts.status !== "all") {
    sql += " AND l.status = ?";
    params.push(opts.status);
  }
  if (opts.q) {
    const like = `%${opts.q}%`;
    sql +=
      " AND (l.title LIKE ? OR l.listing_ref LIKE ? OR IFNULL(l.city,'') LIKE ? OR IFNULL(l.locality,'') LIKE ?)";
    params.push(like, like, like, like);
  }
  sql += " ORDER BY l.updated_at DESC";
  return db.prepare(sql).all(...params) as Listing[];
}

export function getListing(user: SessionUser, id: string): Listing | null {
  const row = getDb()
    .prepare(
      `SELECT l.*,
        (SELECT COUNT(*) FROM inquiries i WHERE i.listing_id = l.id) as inquiry_count
       FROM listings l WHERE l.id = ? AND l.workspace_id = ?`
    )
    .get(id, user.workspace_id) as Listing | undefined;
  return row ?? null;
}

export function getListingByRef(
  workspaceId: string,
  listingRef: string
): Listing | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM listings WHERE workspace_id = ? AND listing_ref = ?`
    )
    .get(workspaceId, listingRef) as Listing | undefined;
  return row ?? null;
}

export type ListingInput = {
  listing_ref: string;
  title: string;
  city?: string | null;
  locality?: string | null;
  property_type?: string | null;
  beds?: number | null;
  size_text?: string | null;
  price_min_minor?: number | null;
  price_max_minor?: number | null;
  currency?: string;
  public_url?: string | null;
  description?: string | null;
  status?: ListingStatus;
};

export function createListing(user: SessionUser, input: ListingInput): Listing {
  const ref = String(input.listing_ref || "").trim();
  const title = String(input.title || "").trim();
  if (!ref || !title) {
    throw new AuthError("listing_ref and title are required", 400);
  }
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM listings WHERE workspace_id = ? AND listing_ref = ?`
    )
    .get(user.workspace_id, ref);
  if (existing) {
    throw new AuthError("listing_ref already exists in this workspace", 409);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status: ListingStatus = input.status || "active";
  db.prepare(
    `INSERT INTO listings (
      id, workspace_id, listing_ref, title, city, locality, property_type,
      beds, size_text, price_min_minor, price_max_minor, currency,
      public_url, description, status, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    user.workspace_id,
    ref,
    title,
    input.city?.trim() || null,
    input.locality?.trim() || null,
    input.property_type?.trim() || null,
    input.beds ?? null,
    input.size_text?.trim() || null,
    input.price_min_minor ?? null,
    input.price_max_minor ?? null,
    input.currency || "PKR",
    input.public_url?.trim() || null,
    input.description?.trim() || null,
    status,
    now,
    now
  );
  return getListing(user, id)!;
}

export function updateListing(
  user: SessionUser,
  id: string,
  input: Partial<ListingInput>
): Listing {
  const existing = getListing(user, id);
  if (!existing) throw new AuthError("Listing not found", 404);
  if (!isManagerOrOwner(user.role) && user.role !== "agent") {
    throw new AuthError("Forbidden", 403);
  }
  const db = getDb();
  const nextRef =
    input.listing_ref != null
      ? String(input.listing_ref).trim()
      : existing.listing_ref;
  if (!nextRef) throw new AuthError("listing_ref required", 400);
  if (nextRef !== existing.listing_ref) {
    const clash = db
      .prepare(
        `SELECT id FROM listings WHERE workspace_id = ? AND listing_ref = ? AND id != ?`
      )
      .get(user.workspace_id, nextRef, id);
    if (clash) {
      throw new AuthError("listing_ref already exists in this workspace", 409);
    }
  }
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE listings SET
      listing_ref=?, title=?, city=?, locality=?, property_type=?,
      beds=?, size_text=?, price_min_minor=?, price_max_minor=?,
      currency=?, public_url=?, description=?, status=?, updated_at=?
     WHERE id=? AND workspace_id=?`
  ).run(
    nextRef,
    input.title != null ? String(input.title).trim() : existing.title,
    input.city !== undefined ? input.city?.trim() || null : existing.city,
    input.locality !== undefined
      ? input.locality?.trim() || null
      : existing.locality,
    input.property_type !== undefined
      ? input.property_type?.trim() || null
      : existing.property_type,
    input.beds !== undefined ? input.beds : existing.beds,
    input.size_text !== undefined
      ? input.size_text?.trim() || null
      : existing.size_text,
    input.price_min_minor !== undefined
      ? input.price_min_minor
      : existing.price_min_minor,
    input.price_max_minor !== undefined
      ? input.price_max_minor
      : existing.price_max_minor,
    input.currency || existing.currency,
    input.public_url !== undefined
      ? input.public_url?.trim() || null
      : existing.public_url,
    input.description !== undefined
      ? input.description?.trim() || null
      : existing.description,
    input.status || existing.status,
    now,
    id,
    user.workspace_id
  );
  return getListing(user, id)!;
}

/** Active/paused listings for new inquiries (archived excluded). */
export function selectableListings(user: SessionUser): Listing[] {
  return listListings(user, { status: "all" }).filter(
    (l) => l.status === "active" || l.status === "paused"
  );
}
