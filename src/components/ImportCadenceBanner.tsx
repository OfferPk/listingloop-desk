"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";

export function ImportCadenceBanner({
  show,
  lastSuccessfulAt,
  remindDays = 3,
}: {
  show: boolean;
  lastSuccessfulAt: string | null;
  /** Constant N from server (no settings UI). */
  remindDays?: number;
}) {
  const [hidden, setHidden] = useState(false);
  if (!show || hidden) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            Re-upload portal CSV → Import
          </p>
          <p className="text-xs text-amber-900/80">
            {lastSuccessfulAt
              ? `Last successful import was over ${remindDays} days ago (${formatDateTime(lastSuccessfulAt)}). Portal / Meta CSV yahan dubara upload karo.`
              : `Koi successful import nahi — portal / Meta CSV upload karo taake leads miss na hon.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/imports/new" className="btn-primary !py-1.5 text-xs">
            Import
          </Link>
          <button
            type="button"
            className="btn-secondary !py-1.5 text-xs"
            onClick={() => setHidden(true)}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
