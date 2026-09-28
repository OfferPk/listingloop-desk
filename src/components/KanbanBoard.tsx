"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STAGE_LABELS, STAGES, type Inquiry, type Stage } from "@/lib/types";
import { formatBudgetRange, formatDateTime } from "@/lib/format";
import { LostReasonPicker } from "@/components/LostReasonPicker";

export function KanbanBoard({
  inquiries,
  visibleStages,
}: {
  inquiries: Inquiry[];
  /** Columns to paint; defaults to all STAGES for backward compat. */
  visibleStages?: Stage[];
}) {
  const columns = visibleStages?.length ? visibleStages : [...STAGES];
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingLostId, setPendingLostId] = useState<string | null>(null);

  async function doMove(
    id: string,
    stage: Stage,
    opts: { visit_scheduled_at?: string; lost_reason?: string | null } = {}
  ) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        move_stage: stage,
        visit_scheduled_at: opts.visit_scheduled_at,
        lost_reason: opts.lost_reason,
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Move failed");
      return;
    }
    router.refresh();
  }

  async function move(id: string, stage: Stage) {
    if (stage === "visit_scheduled") {
      const raw = prompt(
        "Visit date/time (YYYY-MM-DDTHH:mm)",
        new Date().toISOString().slice(0, 16)
      );
      if (!raw) return;
      await doMove(id, stage, {
        visit_scheduled_at: new Date(raw).toISOString(),
      });
      return;
    }
    if (stage === "lost") {
      setPendingLostId(id);
      return;
    }
    await doMove(id, stage);
  }

  const byStage = Object.fromEntries(
    columns.map((s) => [s, inquiries.filter((i) => i.stage === s)])
  ) as Record<Stage, Inquiry[]>;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <LostReasonPicker
        open={pendingLostId != null}
        onCancel={() => setPendingLostId(null)}
        onConfirm={async (reason) => {
          const id = pendingLostId;
          setPendingLostId(null);
          if (!id) return;
          await doMove(id, "lost", { lost_reason: reason });
        }}
      />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((stage) => (
          <div key={stage} className="min-w-[220px] flex-1 rounded-xl bg-slate-100 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="text-xs text-slate-400">{byStage[stage].length}</span>
            </div>
            <div className="space-y-2">
              {byStage[stage].map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <Link
                    href={`/inquiries/${i.id}`}
                    className="font-medium text-slate-800 hover:text-indigo-700"
                  >
                    {i.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {i.listing_ref || "No listing"} · {i.owner_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatBudgetRange(i.budget_min_minor, i.budget_max_minor, i.currency)}
                  </p>
                  {i.next_follow_up_at && (
                    <p className="text-xs text-amber-700">
                      FU {formatDateTime(i.next_follow_up_at)}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STAGES.filter((s) => s !== stage)
                      .slice(0, 3)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busyId === i.id}
                          onClick={() => move(i.id, s)}
                          className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          → {STAGE_LABELS[s]}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
