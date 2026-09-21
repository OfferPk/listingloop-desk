"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImportUploadPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/imports", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Upload failed"); return; }
    router.push(`/imports/${data.job.id}/map`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Upload CSV</h1>
      <form onSubmit={onSubmit} className="card space-y-3">
        <p className="text-sm text-slate-500">Require name + phone columns. Max 2000 rows / 2MB. Phones are normalized; duplicates by phone (and external_ref) are skipped.</p>
        <input type="file" name="file" accept=".csv,text/csv" required className="input" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "Uploading…" : "Upload"}</button>
      </form>
    </div>
  );
}
