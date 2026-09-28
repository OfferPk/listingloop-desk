"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = {
  n: number;
  en: string;
  ur: string;
  href: string;
  cta: string;
  managerOnly?: boolean;
  extraHref?: string;
  extraCta?: string;
  managerExtraOnly?: boolean;
};

const STEPS_BASE: Omit<Step, "n">[] = [
  {
    en: "Add a listing",
    ur: "Pehli listing add karo",
    href: "/listings/new",
    cta: "New listing",
  },
  {
    en: "Capture an inquiry or import CSV",
    ur: "Nayi inquiry ya CSV import",
    href: "/inquiries/new",
    cta: "New inquiry",
    extraHref: "/imports/new",
    extraCta: "Import CSV",
    managerExtraOnly: true,
  },
  {
    en: "Invite an agent",
    ur: "Agent invite karo",
    href: "/team",
    cta: "Open Team",
    managerOnly: true,
  },
];

function storageKey(userId: string) {
  return `listingloop_onboarding_dismissed_${userId}`;
}

export function OnboardingChecklist({
  show,
  userId,
  isManager,
  allowSample = false,
}: {
  show: boolean;
  userId: string;
  isManager: boolean;
  /** Manager/owner: show seed CTA when checklist is visible */
  allowSample?: boolean;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey(userId));
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, [userId]);

  if (!show || !ready || dismissed) return null;

  const steps: Step[] = STEPS_BASE.filter(
    (s) => !s.managerOnly || isManager
  ).map((s, i) => ({ ...s, n: i + 1 }));

  function dismiss() {
    try {
      localStorage.setItem(storageKey(userId), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  async function seedSample() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inquiries/sample", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create sample");
        setBusy(false);
        return;
      }
      router.push(`/inquiries/${data.inquiry.id}`);
      router.refresh();
    } catch {
      setError("Could not create sample");
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-indigo-900">
            Get started in 3 steps
          </h2>
          <p className="text-xs text-indigo-800/80">
            Listing → inquiry → team — pehle yeh 3 steps
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-700"
          onClick={dismiss}
        >
          Dismiss / Chhupa do
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li
            key={s.href + s.n}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {s.n}
              </span>
              <span className="font-medium text-slate-800">{s.en}</span>
              <div className="ml-7 text-xs text-slate-500">{s.ur}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link href={s.href} className="btn-secondary !px-2 !py-1 text-xs">
                {s.cta}
              </Link>
              {s.extraHref &&
                s.extraCta &&
                (!s.managerExtraOnly || isManager) && (
                  <Link
                    href={s.extraHref}
                    className="btn-secondary !px-2 !py-1 text-xs"
                  >
                    {s.extraCta}
                  </Link>
                )}
            </div>
          </li>
        ))}
      </ol>
      {allowSample && isManager && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={busy}
            onClick={seedSample}
          >
            Seed sample inquiry
          </button>
          <span className="text-xs text-slate-500">
            Sample listing + inquiry (follow-up aaj)
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
