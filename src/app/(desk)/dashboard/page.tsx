import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardStats, getTodayQueue } from "@/lib/inquiries";
import { formatDateTime } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = getDashboardStats(user);
  const queue = getTodayQueue(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Today</h1>
          <p className="text-sm text-slate-500">{user.workspace_name}</p>
        </div>
        <Link href="/inquiries/new" className="btn-primary">+ Add inquiry</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card"><p className="text-xs text-slate-500">Overdue</p><p className="text-2xl font-semibold text-red-600">{stats.overdue}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Visits today</p><p className="text-2xl font-semibold">{stats.visits_today}</p></div>
        <div className="card"><p className="text-xs text-slate-500">New</p><p className="text-2xl font-semibold text-indigo-700">{stats.new_count}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Due today</p><p className="text-2xl font-semibold">{stats.due_today}</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-medium">Overdue follow-ups</h2>
          {queue.overdue.length === 0 ? (
            <p className="text-sm text-slate-400">None</p>
          ) : (
            <ul className="space-y-2">
              {queue.overdue.slice(0, 8).map((i) => (
                <li key={i.id}>
                  <Link href={`/inquiries/${i.id}`} className="text-sm text-indigo-700 hover:underline">
                    {i.name} · {formatDateTime(i.next_follow_up_at)} · {STAGE_LABELS[i.stage]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Visits today</h2>
          {queue.visits_today.length === 0 ? (
            <p className="text-sm text-slate-400">None</p>
          ) : (
            <ul className="space-y-2">
              {queue.visits_today.slice(0, 8).map((v) => (
                <li key={v.id} className="text-sm">
                  <Link href={`/inquiries/${v.inquiry_id}`} className="text-indigo-700 hover:underline">
                    {(v as { inquiry_name?: string }).inquiry_name || "Visit"} · {formatDateTime(v.scheduled_at)}
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
