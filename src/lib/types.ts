export type Role = "owner" | "manager" | "agent";

export type Stage =
  | "new"
  | "contacted"
  | "visit_scheduled"
  | "negotiation"
  | "won"
  | "lost";

export type ListingStatus = "active" | "paused" | "archived";
export type VisitStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export type InquirySource =
  | "whatsapp"
  | "portal"
  | "meta_ads"
  | "phone"
  | "walk_in"
  | "referral"
  | "other";

export const STAGES: Stage[] = [
  "new",
  "contacted",
  "visit_scheduled",
  "negotiation",
  "won",
  "lost",
];

export const STAGE_LABELS: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  visit_scheduled: "Visit scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const OPEN_STAGES: Stage[] = [
  "new",
  "contacted",
  "visit_scheduled",
  "negotiation",
];

export const SOURCES: InquirySource[] = [
  "whatsapp",
  "portal",
  "meta_ads",
  "phone",
  "walk_in",
  "referral",
  "other",
];

export const SOURCE_LABELS: Record<InquirySource, string> = {
  whatsapp: "WhatsApp",
  portal: "Portal",
  meta_ads: "Meta Ads",
  phone: "Phone",
  walk_in: "Walk-in",
  referral: "Referral",
  other: "Other",
};

export const LISTING_STATUSES: ListingStatus[] = ["active", "paused", "archived"];
export const VISIT_STATUSES: VisitStatus[] = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
];

export const NOTE_PRESETS = [
  { key: "sent_brochure", label: "Sent brochure" },
  { key: "called", label: "Called" },
  { key: "visit_done", label: "Visit done" },
  { key: "asked_for_price", label: "Asked for price" },
  { key: "token_discussed", label: "Token discussed" },
  { key: "follow_up_later", label: "Follow up later" },
] as const;

export type WaTemplateKey =
  | "first_response"
  | "brochure_sent"
  | "confirm_visit"
  | "visit_follow_up"
  | "re_engage";

export const WA_TEMPLATE_KEYS: WaTemplateKey[] = [
  "first_response",
  "brochure_sent",
  "confirm_visit",
  "visit_follow_up",
  "re_engage",
];

export const LOST_REASONS = [
  "budget",
  "location",
  "timing",
  "chose_other",
  "no_response",
  "other",
] as const;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  workspace_id: string;
  workspace_name: string;
  membership_id: string;
}

export interface Listing {
  id: string;
  workspace_id: string;
  listing_ref: string;
  title: string;
  city: string | null;
  locality: string | null;
  property_type: string | null;
  beds: number | null;
  size_text: string | null;
  price_min_minor: number | null;
  price_max_minor: number | null;
  currency: string;
  public_url: string | null;
  description: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  inquiry_count?: number;
}

export interface Inquiry {
  id: string;
  workspace_id: string;
  listing_id: string | null;
  owner_id: string;
  created_by: string;
  name: string;
  phone: string;
  email: string | null;
  source: InquirySource;
  source_detail: string | null;
  external_ref: string | null;
  property_type: string | null;
  preferred_locality: string | null;
  budget_min_minor: number | null;
  budget_max_minor: number | null;
  currency: string;
  bedrooms: number | null;
  message: string | null;
  stage: Stage;
  next_follow_up_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  listing_ref?: string | null;
  listing_title?: string | null;
  listing_locality?: string | null;
}

export interface InquiryVisit {
  id: string;
  inquiry_id: string;
  scheduled_at: string;
  status: VisitStatus;
  outcome_note: string | null;
  created_by: string;
  updated_at: string;
  inquiry_name?: string;
  listing_title?: string | null;
  owner_name?: string;
  owner_id?: string;
}

export interface InquiryNote {
  id: string;
  inquiry_id: string;
  user_id: string;
  body: string;
  template_key: string | null;
  created_at: string;
  user_name?: string;
}

export interface InquiryEvent {
  id: string;
  workspace_id: string;
  inquiry_id: string | null;
  user_id: string;
  event_type: string;
  metadata_json: string;
  created_at: string;
  user_name?: string;
}

export type MapTarget =
  | "name"
  | "phone"
  | "email"
  | "source"
  | "source_detail"
  | "listing_ref"
  | "locality"
  | "budget_min"
  | "budget_max"
  | "currency"
  | "message"
  | "external_ref"
  | "created_at"
  | "ignore";

export const MAP_TARGETS: MapTarget[] = [
  "name",
  "phone",
  "email",
  "source",
  "source_detail",
  "listing_ref",
  "locality",
  "budget_min",
  "budget_max",
  "currency",
  "message",
  "external_ref",
  "created_at",
  "ignore",
];

export type ImportJobStatus =
  | "uploaded"
  | "mapped"
  | "previewed"
  | "committing"
  | "done"
  | "failed";

export type ImportRowOutcome =
  | "created"
  | "duplicate"
  | "invalid"
  | "error"
  | "pending";

export interface ImportJob {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  filename: string;
  mapping_json: string;
  headers_json: string;
  sample_rows_json: string | null;
  rows_json: string | null;
  row_count: number;
  created_count: number;
  duplicate_count: number;
  invalid_count: number;
  error_count: number;
  status: ImportJobStatus;
  default_owner_id: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface DashboardStats {
  overdue: number;
  visits_today: number;
  new_count: number;
  due_today: number;
  open_total: number;
  counts: Record<Stage, number>;
}

export const MAX_NOTE_LENGTH = 5000;
export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
