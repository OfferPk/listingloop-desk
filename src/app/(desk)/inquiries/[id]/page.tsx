import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getInquiry, listNotes, listEvents, listVisitsForInquiry } from "@/lib/inquiries";
import { formatBudgetRange, formatDateTime } from "@/lib/format";
import { SOURCE_LABELS, STAGE_LABELS } from "@/lib/types";
import { InquiryActions } from "@/components/InquiryActions";
import { VisitOutcomeControls } from "@/components/VisitOutcomeControls";

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const inquiry = getInquiry(user, id);
  const notes = listNotes(user, id);
  const events = listEvents(user, id);
  const visits = listVisitsForInquiry(user, id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/board" className="hover:text-indigo-700">Board</Link>
        <span>/</span>
        <span>{inquiry.name}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold">{inquiry.name}</h1>
                <p className="text-sm text-slate-500">{inquiry.phone}{inquiry.email ? ` · ${inquiry.email}` : ""}</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">
                {STAGE_LABELS[inquiry.stage]}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-slate-400">Source</dt><dd>{SOURCE_LABELS[inquiry.source]}{inquiry.source_detail ? ` (${inquiry.source_detail})` : ""}</dd></div>
              <div><dt className="text-xs text-slate-400">Owner</dt><dd>{inquiry.owner_name}</dd></div>
              <div><dt className="text-xs text-slate-400">Listing</dt><dd>{inquiry.listing_ref || "—"} {inquiry.listing_title ? `· ${inquiry.listing_title}` : ""}</dd></div>
              <div><dt className="text-xs text-slate-400">Locality</dt><dd>{inquiry.preferred_locality || inquiry.listing_locality || "—"}</dd></div>
              <div><dt className="text-xs text-slate-400">Budget</dt><dd>{formatBudgetRange(inquiry.budget_min_minor, inquiry.budget_max_minor, inquiry.currency)}</dd></div>
              <div><dt className="text-xs text-slate-400">Follow-up</dt><dd>{formatDateTime(inquiry.next_follow_up_at)}</dd></div>
            </dl>
            {inquiry.message && <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{inquiry.message}</p>}
            {inquiry.lost_reason && <p className="text-sm text-red-600">Lost: {inquiry.lost_reason}</p>}
          </section>

          <section className="card">
            <h2 className="mb-2 font-medium">Notes</h2>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <p>{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{n.user_name} · {formatDateTime(n.created_at)}</p>
                </li>
              ))}
              {notes.length === 0 && <p className="text-sm text-slate-400">No notes yet</p>}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-2 font-medium">Visits</h2>
            <VisitOutcomeControls inquiryId={inquiry.id} visits={visits} />
          </section>

          <section className="card">
            <h2 className="mb-2 font-medium">Activity</h2>
            <ul className="space-y-1 text-xs text-slate-600">
              {events.slice(0, 30).map((e) => (
                <li key={e.id}>{formatDateTime(e.created_at)} · {e.user_name} · {e.event_type}</li>
              ))}
              {events.length === 0 && <p className="text-slate-400">No events</p>}
            </ul>
          </section>
        </div>

        <InquiryActions inquiryId={inquiry.id} stage={inquiry.stage} phone={inquiry.phone} />
      </div>
    </div>
  );
}
