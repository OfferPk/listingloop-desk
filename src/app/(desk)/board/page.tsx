import Link from "next/link";
import { requireUser, isManagerOrOwner } from "@/lib/auth";
import { listInquiries, getDashboardStats } from "@/lib/inquiries";
import { listListings } from "@/lib/listings";
import { getDb } from "@/lib/db";
import { KanbanBoard } from "@/components/KanbanBoard";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { SOURCE_LABELS, STAGES, STAGE_LABELS, type InquirySource } from "@/lib/types";
import {
  boardVisibleStages,
  parseBoardShowClosed,
} from "@/lib/board-filter";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const showClosed = parseBoardShowClosed(sp);
  const visibleStages = boardVisibleStages(showClosed, sp.stage);
  const inquiries = listInquiries(user, {
    listing_id: sp.listing_id,
    owner_id: sp.owner_id,
    source: sp.source,
    stage: sp.stage,
    locality: sp.locality,
    q: sp.q,
  });
  const listings = listListings(user, { status: "all" });
  const stats = getDashboardStats(user);
  const showChecklist = stats.open_total === 0 || listings.length === 0;
  const isManager = isManagerOrOwner(user.role);
  const members = getDb()
    .prepare(
      `SELECT u.id, u.name FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ? AND m.status = 'active' ORDER BY u.name`
    )
    .all(user.workspace_id) as { id: string; name: string }[];

  // Preserve non-closed filters when toggling closed columns.
  const closedToggleParams = new URLSearchParams();
  for (const key of ["q", "locality", "listing_id", "owner_id", "source", "stage"] as const) {
    if (sp[key]) closedToggleParams.set(key, sp[key]!);
  }
  const hideClosedHref =
    closedToggleParams.toString() ? `/board?${closedToggleParams}` : "/board";
  closedToggleParams.set("closed", "1");
  const showClosedHref = `/board?${closedToggleParams}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Pipeline</p>
          <h1 className="page-title mt-1">Inquiry board</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showClosed ? (
            <Link href={hideClosedHref} className="btn-secondary !text-xs">
              Hide closed
            </Link>
          ) : (
            <Link href={showClosedHref} className="btn-secondary !text-xs">
              Show closed
            </Link>
          )}
          <Link href="/inquiries/new" className="btn-primary">
            + New
          </Link>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-600">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
        {showClosed
          ? "All stages are visible, including won and lost inquiries."
          : "Active inquiries only. Won and lost stay tucked away until you reveal them."}
      </p>

      <OnboardingChecklist
        show={showChecklist}
        userId={user.id}
        isManager={isManager}
        allowSample={isManager}
      />

      <form
        className="filter-panel grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        method="get"
      >
        {showClosed && <input type="hidden" name="closed" value="1" />}
        <input
          className="input"
          name="q"
          aria-label="Search by name, phone, or reference"
          defaultValue={sp.q || ""}
          placeholder="Search name/phone/ref"
        />
        <input
          className="input"
          name="locality"
          aria-label="Filter by city or locality"
          defaultValue={sp.locality || ""}
          placeholder="City / locality"
        />
        <select className="input" name="listing_id" aria-label="Filter by listing" defaultValue={sp.listing_id || ""}>
          <option value="">All listings</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.listing_ref} — {l.title}
            </option>
          ))}
        </select>
        <select className="input" name="owner_id" aria-label="Filter by owner" defaultValue={sp.owner_id || ""}>
          <option value="">All owners</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select className="input" name="source" aria-label="Filter by source" defaultValue={sp.source || ""}>
          <option value="">All sources</option>
          {(Object.keys(SOURCE_LABELS) as InquirySource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <select className="input" name="stage" aria-label="Filter by stage" defaultValue={sp.stage || ""}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-secondary">
            Filter
          </button>
            <Link href="/board" className="text-xs font-medium text-emerald-800 hover:underline">
            Clear
          </Link>
        </div>
      </form>
      <KanbanBoard inquiries={inquiries} visibleStages={visibleStages} />
    </div>
  );
}
