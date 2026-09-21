import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listImportJobs } from "@/lib/imports";
import { formatDateTime } from "@/lib/format";

export default async function ImportsPage() {
  const user = await requireUser();
  const jobs = listImportJobs(user);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CSV import</h1>
        <Link href="/imports/new" className="btn-primary">Upload CSV</Link>
      </div>
      <div className="card">
        <ul className="divide-y">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <Link href={`/imports/${j.id}/map`} className="font-medium text-indigo-700 hover:underline">{j.filename}</Link>
                <p className="text-xs text-slate-400">{formatDateTime(j.created_at)} · {j.status} · {j.row_count} rows</p>
              </div>
              <div className="text-xs text-slate-500">
                +{j.created_count} / dup {j.duplicate_count} / bad {j.invalid_count}
              </div>
            </li>
          ))}
          {jobs.length === 0 && <p className="py-4 text-sm text-slate-400">No imports yet</p>}
        </ul>
      </div>
    </div>
  );
}
