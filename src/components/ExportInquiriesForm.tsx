"use client";

import { useMemo, useState } from "react";
import { OPEN_STAGES } from "@/lib/types";

type StagePreset = "all" | "open" | "won" | "lost";

const PRESET_STAGE: Record<StagePreset, string | undefined> = {
  all: undefined,
  open: OPEN_STAGES.join(","),
  won: "won",
  lost: "lost",
};

export function ExportInquiriesForm() {
  const [preset, setPreset] = useState<StagePreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const href = useMemo(() => {
    const p = new URLSearchParams();
    const stage = PRESET_STAGE[preset];
    if (stage) p.set("stage", stage);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    return qs ? `/api/export/inquiries.csv?${qs}` : "/api/export/inquiries.csv";
  }, [preset, from, to]);

  return (
    <div className="card space-y-3 max-w-lg">
      <h2 className="font-medium">Inquiry CSV</h2>
      <p className="text-sm text-slate-500">
        Formula-safe UTF-8. Date window filters on <code className="text-xs">created_at</code>{" "}
        (YYYY-MM-DD). Agents cannot export.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Stage preset</label>
        <select
          className="input"
          value={preset}
          onChange={(e) => setPreset(e.target.value as StagePreset)}
        >
          <option value="all">All</option>
          <option value="open">Open active (new → negotiation)</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="export-from">
            From (created_at)
          </label>
          <input
            id="export-from"
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="export-to">
            To
          </label>
          <input
            id="export-to"
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <a className="btn-primary inline-flex text-sm" href={href}>
        Download inquiries.csv
      </a>
    </div>
  );
}
