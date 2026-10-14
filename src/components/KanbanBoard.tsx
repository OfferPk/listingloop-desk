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
  const [busyStage, setBusyStage] = useState<Stage | null>(null);
  const [error, setError] = useState("");
  const [pendingLostId, setPendingLostId] = useState<string | null>(null);

  async function doMove(
    id: string,
    stage: Stage,
    opts: { visit_scheduled_at?: string; lost_reason?: string | null } = {}
  ) {
    setBusyId(id);
    setBusyStage(stage);
    setError("");
    let res: Response;
    try {
      res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          move_stage: stage,
          visit_scheduled_at: opts.visit_scheduled_at,
          lost_reason: opts.lost_reason,
        }),
      });
    } catch {
      setBusyId(null);
      setBusyStage(null);
      setError("Connection interrupted. Please try again.");
      return;
    }
    setBusyId(null);
    setBusyStage(null);
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
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {busyId && busyStage && (
        <p role="status" aria-live="polite" className="sr-only">
          Moving inquiry to {STAGE_LABELS[busyStage]}.
        </p>
      )}
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
      {columns.length > 1 && (
        <p className="text-xs text-slate-500 sm:hidden">
          Swipe horizontally to see every stage <span aria-hidden="true">→</span>
        </p>
      )}
      <div
        className="board-columns flex gap-4 overflow-x-auto pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        role="region"
        aria-label="Inquiry stages"
        tabIndex={0}
      >
        {columns.map((stage) => (
          <div key={stage} className="board-lane w-[min(19rem,90vw)] shrink-0">
            <div className="lane-header mb-3 flex items-center justify-between px-1">
              <h3 className="lane-title">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="count-pill">{byStage[stage].length}</span>
            </div>
            <div className="space-y-2">
              {byStage[stage].length === 0 ? (
                <div className="lane-empty">No inquiries in this stage</div>
              ) : byStage[stage].map((i) => (
                <div
                  key={i.id}
                  className="inquiry-card"
                  aria-busy={busyId === i.id}
                >
                  <Link
                    href={`/inquiries/${i.id}`}
                    className="font-semibold text-slate-900 hover:text-emerald-800"
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
                          aria-label={`Move ${i.name} to ${STAGE_LABELS[s]}`}
                          aria-busy={busyId === i.id && busyStage === s}
                          className="stage-action"
                        >
                          {busyId === i.id && busyStage === s
                            ? "Moving…"
                            : `→ ${STAGE_LABELS[s]}`}
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
