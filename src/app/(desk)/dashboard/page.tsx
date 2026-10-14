import Link from "next/link";
import { requireUser, isManagerOrOwner } from "@/lib/auth";
import { getDashboardStats, getTodayQueue } from "@/lib/inquiries";
import { listListings } from "@/lib/listings";
import { getImportCadenceState, IMPORT_CADENCE_DAYS } from "@/lib/imports";
import { formatDateTime } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/types";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { ImportCadenceBanner } from "@/components/ImportCadenceBanner";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = getDashboardStats(user);
  const queue = getTodayQueue(user);
  const listings = listListings(user, { status: "all" });
  const showChecklist = stats.open_total === 0 || listings.length === 0;
  const isManager = isManagerOrOwner(user.role);
  const cadence = isManager
    ? getImportCadenceState(user)
    : { show: false, lastSuccessfulAt: null };

  const metrics = [
    { label: "Overdue", value: stats.overdue, note: "Follow-ups past due", tone: "danger" },
    { label: "Visits today", value: stats.visits_today, note: "On today's schedule", tone: "green" },
    { label: "New inquiries", value: stats.new_count, note: "Waiting for first contact", tone: "gold" },
    { label: "Due today", value: stats.due_today, note: "Follow-ups scheduled today", tone: "neutral" },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="dashboard-hero">
        <div className="relative z-10 min-w-0">
          <p className="page-eyebrow">Daily overview</p>
          <h1 className="page-title mt-1">Today</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {user.workspace_name} <span aria-hidden="true">·</span> Keep every inquiry moving with a clear next step.
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-wrap gap-2">
          <Link href="/inquiries/new" className="btn-primary">
            <span className="text-lg leading-none" aria-hidden="true">+</span>
            Add inquiry
          </Link>
          <Link href="/board" className="btn-secondary">
            Inquiry board <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <OnboardingChecklist
        show={showChecklist}
        userId={user.id}
        isManager={isManager}
        allowSample={isManager}
      />

      {isManager && (
        <ImportCadenceBanner
          show={cadence.show}
          lastSuccessfulAt={cadence.lastSuccessfulAt}
          remindDays={IMPORT_CADENCE_DAYS}
        />
      )}

      <section aria-label="Inquiry summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card" data-tone={metric.tone}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-note">{metric.note}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="page-eyebrow">Needs attention</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Overdue follow-ups</h2>
            </div>
            <span className="count-pill" aria-label={`${queue.overdue.length} overdue follow-ups`}>
              {queue.overdue.length}
            </span>
          </div>
          {queue.overdue.length === 0 ? (
            <div className="queue-empty">
              <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-800" aria-hidden="true">✓</span>
              <p className="font-medium text-slate-700">You&apos;re all caught up</p>
              <p className="mt-1 text-xs">Koi overdue follow-up nahi.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.overdue.slice(0, 8).map((inquiry) => (
                <li key={inquiry.id}>
                  <Link href={`/inquiries/${inquiry.id}`} className="queue-row">
                    <span className="queue-dot" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="queue-title">{inquiry.name}</span>
                      <span className="queue-detail">
                        {formatDateTime(inquiry.next_follow_up_at)} <span aria-hidden="true">·</span> {STAGE_LABELS[inquiry.stage]}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-400" aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="page-eyebrow">On the calendar</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Visits today</h2>
            </div>
            <span className="count-pill" aria-label={`${queue.visits_today.length} visits today`}>
              {queue.visits_today.length}
            </span>
          </div>
          {queue.visits_today.length === 0 ? (
            <div className="queue-empty">
              <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-800" aria-hidden="true">⌖</span>
              <p className="font-medium text-slate-700">No visits on the calendar</p>
              <p className="mt-1 text-xs">Aaj ke liye koi visit schedule nahi.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.visits_today.slice(0, 8).map((visit) => (
                <li key={visit.id}>
                  <Link href={`/inquiries/${visit.inquiry_id}`} className="queue-row">
                    <span className="queue-dot queue-dot-visit" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="queue-title">{(visit as { inquiry_name?: string }).inquiry_name || "Visit"}</span>
                      <span className="queue-detail">{formatDateTime(visit.scheduled_at)}</span>
                    </span>
                    <span className="text-sm font-semibold text-slate-400" aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
