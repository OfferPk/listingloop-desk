import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getImportJob, getImportReportRows } from "@/lib/imports";
import { notFound } from "next/navigation";

export default async function ImportReportPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  const { jobId } = await params;
  const job = getImportJob(user, jobId);
  if (!job) notFound();
  const rows = getImportReportRows(user, jobId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/imports" className="hover:text-indigo-700">Imports</Link>
        <span>/</span>
        <span>Report</span>
      </div>
      <h1 className="text-xl font-semibold">{job.filename}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card"><p className="text-xs text-slate-500">Created</p><p className="text-xl font-semibold text-green-700">{job.created_count}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Duplicates</p><p className="text-xl font-semibold">{job.duplicate_count}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Invalid</p><p className="text-xl font-semibold text-amber-700">{job.invalid_count}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Errors</p><p className="text-xl font-semibold text-red-600">{job.error_count}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b text-slate-500"><th className="py-1">Row</th><th>Outcome</th><th>Phone</th><th>Message</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="py-1">{r.row_number}</td>
                <td>{r.outcome}</td>
                <td>{r.phone_normalized || "—"}</td>
                <td>{r.message || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/board" className="btn-primary">Go to board</Link>
    </div>
  );
}
