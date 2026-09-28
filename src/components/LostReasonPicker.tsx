"use client";
import { useState } from "react";
import {
  LOST_REASON_PRESETS,
  MAX_LOST_REASON_LENGTH,
} from "@/lib/types";

/**
 * Modal chips for lost_reason (replaces window.prompt).
 * Skip → null; preset label stored; Other → free text (max MAX_LOST_REASON_LENGTH).
 */
export function LostReasonPicker({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (reason: string | null) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  if (!open) return null;

  const isOther = selected === "other";
  const canConfirm =
    selected != null &&
    (!isOther || otherText.trim().length > 0);

  function reset() {
    setSelected(null);
    setOtherText("");
  }

  function confirm() {
    if (!selected) return;
    if (selected === "other") {
      const text = otherText.trim().slice(0, MAX_LOST_REASON_LENGTH);
      if (!text) return;
      onConfirm(text);
    } else {
      const preset = LOST_REASON_PRESETS.find((p) => p.key === selected);
      onConfirm(preset?.label ?? selected);
    }
    reset();
  }

  function skip() {
    onConfirm(null);
    reset();
  }

  function cancel() {
    onCancel();
    reset();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lost-reason-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl space-y-3">
        <h2 id="lost-reason-title" className="font-medium text-slate-800">
          Lost reason
        </h2>
        <p className="text-xs text-slate-500">
          Optional — Skip se null save hota hai. / Optional; Skip saves no reason.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LOST_REASON_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                selected === p.key
                  ? "bg-indigo-100 text-indigo-800 font-medium"
                  : "bg-slate-100 text-slate-700 hover:bg-indigo-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {isOther && (
          <input
            className="input"
            autoFocus
            maxLength={MAX_LOST_REASON_LENGTH}
            placeholder={`Other reason (max ${MAX_LOST_REASON_LENGTH})`}
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary text-xs" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={skip}>
            Skip
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={!canConfirm}
            onClick={confirm}
          >
            Confirm lost
          </button>
        </div>
      </div>
    </div>
  );
}
