"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MAP_TARGETS, type MapTarget } from "@/lib/types";

export default function ImportMapPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, MapTarget>>({});
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ would_create: number; would_duplicate: number; would_invalid: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/imports/${jobId}`).then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([j, u, m]) => {
      const job = j.job;
      if (!job) { setError("Job not found"); return; }
      const h = JSON.parse(job.headers_json || "[]");
      const map = JSON.parse(job.mapping_json || "{}");
      setHeaders(h);
      setMapping(map);
      setMembers((u.users || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setOwnerId(job.default_owner_id || m.user?.id || "");
    });
  }, [jobId]);

  async function saveAndPreview() {
    setBusy(true);
    setError("");
    const mapRes = await fetch(`/api/imports/${jobId}/mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping, default_owner_id: ownerId }),
    });
    if (!mapRes.ok) {
      const d = await mapRes.json().catch(() => ({}));
      setBusy(false);
      setError(d.error || "Mapping failed");
      return;
    }
    const prevRes = await fetch(`/api/imports/${jobId}/preview`, { method: "POST" });
    const prev = await prevRes.json();
    setBusy(false);
    if (!prevRes.ok) { setError(prev.error || "Preview failed"); return; }
    setPreview(prev.preview);
  }

  async function commit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/imports/${jobId}/commit`, { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Commit failed"); return; }
    router.push(`/imports/${jobId}/report`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Map columns</h1>
      <div className="card space-y-3">
        {headers.map((h) => (
          <div key={h} className="flex items-center gap-3">
            <span className="w-40 truncate text-sm font-medium">{h}</span>
            <select
              className="input"
              value={mapping[h] || "ignore"}
              onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as MapTarget })}
            >
              {MAP_TARGETS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label className="label">Default owner for imported rows</label>
          <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {preview && (
          <p className="rounded-lg bg-slate-50 p-2 text-sm">
            Would create <b>{preview.would_create}</b>, duplicate <b>{preview.would_duplicate}</b>, invalid <b>{preview.would_invalid}</b>
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={saveAndPreview} className="btn-secondary">Preview</button>
          <button type="button" disabled={busy || !preview} onClick={commit} className="btn-primary">Commit import</button>
        </div>
      </div>
    </div>
  );
}
