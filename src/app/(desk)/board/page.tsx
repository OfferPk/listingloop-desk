import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listInquiries } from "@/lib/inquiries";
import { listListings } from "@/lib/listings";
import { getDb } from "@/lib/db";
import { KanbanBoard } from "@/components/KanbanBoard";
import { SOURCE_LABELS, STAGES, STAGE_LABELS, type InquirySource } from "@/lib/types";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const inquiries = listInquiries(user, {
    listing_id: sp.listing_id,
    owner_id: sp.owner_id,
    source: sp.source,
    stage: sp.stage,
    locality: sp.locality,
    q: sp.q,
  });
  const listings = listListings(user, { status: "all" });
  const members = getDb()
    .prepare(
      `SELECT u.id, u.name FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ? AND m.status = 'active' ORDER BY u.name`
    )
    .all(user.workspace_id) as { id: string; name: string }[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Inquiry board</h1>
        <Link href="/inquiries/new" className="btn-primary">+ New</Link>
      </div>
      <form className="card grid gap-2 sm:grid-cols-3 lg:grid-cols-6" method="get">
        <input className="input" name="q" defaultValue={sp.q || ""} placeholder="Search name/phone/ref" />
        <select className="input" name="listing_id" defaultValue={sp.listing_id || ""}>
          <option value="">All listings</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.listing_ref} — {l.title}</option>
          ))}
        </select>
        <select className="input" name="owner_id" defaultValue={sp.owner_id || ""}>
          <option value="">All owners</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select className="input" name="source" defaultValue={sp.source || ""}>
          <option value="">All sources</option>
          {(Object.keys(SOURCE_LABELS) as InquirySource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <select className="input" name="stage" defaultValue={sp.stage || ""}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>
      <KanbanBoard inquiries={inquiries} />
    </div>
  );
}
