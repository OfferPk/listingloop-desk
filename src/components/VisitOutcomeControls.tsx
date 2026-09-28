"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VISIT_STATUSES, type VisitStatus } from "@/lib/types";

type VisitRow = {
  id: string;
  scheduled_at: string;
  status: VisitStatus;
  outcome_note: string | null;
};

const LABELS: Record<VisitStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export function VisitOutcomeControls({
  inquiryId,
  visits,
}: {
  inquiryId: string;
  visits: VisitRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of visits) init[v.id] = v.outcome_note || "";
    return init;
  });

  async function setStatus(visitId: string, status: VisitStatus) {
    setBusyId(visitId);
    setError("");
    let outcome_note = notes[visitId]?.trim() || undefined;
    if (status === "completed" && !outcome_note) {
      outcome_note = "Visit done";
      setNotes((n) => ({ ...n, [visitId]: "Visit done" }));
    }
    const res = await fetch(`/api/inquiries/${inquiryId}/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, outcome_note }),
    });
    const d = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(d.error || "Update failed");
      return;
    }
    router.refresh();
  }

  async function saveNote(visitId: string) {
    setBusyId(visitId);
    setError("");
    const res = await fetch(`/api/inquiries/${inquiryId}/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome_note: notes[visitId] || null }),
    });
    const d = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(d.error || "Update failed");
      return;
    }
    router.refresh();
  }

  if (visits.length === 0) {
    return <p className="text-slate-400 text-sm">No visits</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {visits.map((v) => (
        <div key={v.id} className="rounded-lg border border-slate-100 p-2 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {new Date(v.scheduled_at).toLocaleString()} ·{" "}
              <span className="font-medium">{LABELS[v.status]}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {VISIT_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busyId === v.id || v.status === s}
                onClick={() => setStatus(v.id, s)}
                className={`rounded-lg px-2 py-1 text-xs ${
                  v.status === s
                    ? "bg-indigo-100 text-indigo-800 font-medium"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                } disabled:opacity-50`}
              >
                {LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input text-xs flex-1"
              placeholder="Outcome note"
              value={notes[v.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [v.id]: e.target.value }))}
            />
            <button
              type="button"
              disabled={busyId === v.id}
              onClick={() => saveNote(v.id)}
              className="btn-secondary text-xs"
            >
              Save note
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
