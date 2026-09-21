"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { STAGE_LABELS, STAGES, NOTE_PRESETS, type Stage, type WaTemplateKey } from "@/lib/types";

type Template = { key: WaTemplateKey; label: string; body: string };

export function InquiryActions({
  inquiryId,
  stage,
  phone,
}: {
  inquiryId: string;
  stage: Stage;
  phone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [waText, setWaText] = useState("");
  const [selectedTpl, setSelectedTpl] = useState<WaTemplateKey | "">("");

  useEffect(() => {
    fetch(`/api/inquiries/${inquiryId}/wa`)
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates || []);
        if (d.templates?.[0]) {
          setSelectedTpl(d.templates[0].key);
          setWaText(d.templates[0].body);
        }
      })
      .catch(() => {});
  }, [inquiryId]);

  async function move(next: Stage) {
    setBusy(true);
    setError("");
    let visit_scheduled_at: string | undefined;
    let lost_reason: string | undefined;
    if (next === "visit_scheduled") {
      const raw = prompt("Visit date/time", new Date().toISOString().slice(0, 16));
      if (!raw) { setBusy(false); return; }
      visit_scheduled_at = new Date(raw).toISOString();
    }
    if (next === "lost") lost_reason = prompt("Lost reason (optional)") || undefined;
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move_stage: next, visit_scheduled_at, lost_reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed");
      return;
    }
    router.refresh();
  }

  async function saveNote(preset?: string) {
    const body = preset || note;
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/inquiries/${inquiryId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, template_key: preset ? "preset" : null }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Note failed");
      return;
    }
    setNote("");
    router.refresh();
  }

  async function openWa() {
    setBusy(true);
    const res = await fetch(`/api/inquiries/${inquiryId}/wa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_key: selectedTpl || null, text: waText }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "WA failed"); return; }
    window.open(d.url, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  function pickTpl(key: WaTemplateKey) {
    setSelectedTpl(key);
    const t = templates.find((x) => x.key === key);
    if (t) setWaText(t.body);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="card space-y-2">
        <h2 className="font-medium">Move stage</h2>
        <p className="text-xs text-slate-500">Current: {STAGE_LABELS[stage]}</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.filter((s) => s !== stage).map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => move(s)} className="btn-secondary text-xs">
              → {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">WhatsApp handoff</h2>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
          Opens WhatsApp with a draft. You must review and press Send yourself — ListingLoop never sends messages.
        </p>
        <div className="flex flex-wrap gap-1">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickTpl(t.key)}
              className={`rounded-lg px-2 py-1 text-xs ${selectedTpl === t.key ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea className="input" rows={4} value={waText} onChange={(e) => setWaText(e.target.value)} />
        <button type="button" disabled={busy || !phone} onClick={openWa} className="btn-wa">
          Open WhatsApp
        </button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Add note</h2>
        <div className="flex flex-wrap gap-1">
          {NOTE_PRESETS.map((p) => (
            <button key={p.key} type="button" disabled={busy} onClick={() => saveNote(p.label)} className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-indigo-50">
              {p.label}
            </button>
          ))}
        </div>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note…" maxLength={5000} />
        <button type="button" disabled={busy || !note.trim()} onClick={() => saveNote()} className="btn-primary">
          Save note
        </button>
      </section>
    </div>
  );
}
