import Link from "next/link";
import { requireManager, isManagerOrOwner } from "@/lib/auth";
import { listImportJobs, getImportCadenceState, IMPORT_CADENCE_DAYS } from "@/lib/imports";
import { getDashboardStats } from "@/lib/inquiries";
import { listListings } from "@/lib/listings";
import { formatDateTime } from "@/lib/format";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { ImportCadenceBanner } from "@/components/ImportCadenceBanner";

export default async function ImportsPage() {
  const user = await requireManager();
  const jobs = listImportJobs(user);
  const stats = getDashboardStats(user);
  const listings = listListings(user, { status: "all" });
  const showChecklist = stats.open_total === 0 || listings.length === 0;
  const cadence = getImportCadenceState(user);
  const isManager = isManagerOrOwner(user.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CSV import</h1>
        <Link href="/imports/new" className="btn-primary">Upload CSV</Link>
      </div>

      <OnboardingChecklist
        show={showChecklist}
        userId={user.id}
        isManager={isManager}
        allowSample={isManager}
      />

      <ImportCadenceBanner
        show={cadence.show}
        lastSuccessfulAt={cadence.lastSuccessfulAt}
      />

      <div className="card">
        {jobs.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-slate-600">No imports yet</p>
            <p className="text-xs text-slate-500">
              Portal or Meta lead CSV lands here — map columns, preview, then commit.
            </p>
            <Link href="/imports/new" className="btn-primary inline-flex">
              Upload CSV
            </Link>
          </div>
        ) : (
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
          </ul>
        )}
      </div>
    </div>
  );
}
