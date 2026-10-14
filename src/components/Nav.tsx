"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const BASE_LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/board", label: "Inquiry board" },
  { href: "/listings", label: "Listings" },
  { href: "/inquiries/new", label: "New inquiry" },
];

const MANAGER_LINKS = [
  { href: "/imports", label: "Import" },
  { href: "/export", label: "Export CSV" },
  { href: "/team", label: "Team" },
];

export function Nav({
  user,
}: {
  user: { name: string; role: string; email: string; workspace_name: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const links =
    user.role === "owner" || user.role === "manager"
      ? [...BASE_LINKS, ...MANAGER_LINKS]
      : BASE_LINKS;

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function linkIsActive(href: string) {
    if (pathname === href) return true;
    return href !== "/inquiries/new" && pathname.startsWith(href + "/");
  }

  function navLink(href: string, label: string, mobile = false) {
    const active = linkIsActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={mobile ? () => setOpen(false) : undefined}
        className={`${mobile ? "nav-link block" : "nav-link"} ${
          active ? "nav-link-active" : "nav-link-idle"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="app-header sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 text-slate-900">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3.5 10.5 8.5-7 8.5 7V21h-17V10.5Z" />
                <path d="M9 21v-7h6v7M3.5 10.5 12 3.5l8.5 7" />
              </svg>
            </span>
            <span className="text-[15px] font-bold tracking-tight sm:text-base">
              Listing<span className="text-emerald-800">Loop</span>
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Desk</span>
            </span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
            {links.map((link) => navLink(link.href, link.label))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:flex">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-900" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-32 truncate text-xs font-semibold text-slate-700">{user.name}</span>
            <span className="border-l border-slate-200 pl-2 text-[10px] capitalize text-slate-500">{user.role}</span>
          </span>
          <button type="button" onClick={logout} disabled={busy} className="btn-secondary !min-h-9 !px-3 !py-1.5 text-xs">
            {busy ? "Logging out…" : "Log out"}
          </button>
          <button
            type="button"
            className="btn-secondary !min-h-9 !px-3 !py-1.5 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-primary-navigation"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-primary-navigation" aria-label="Mobile navigation" className="grid grid-cols-2 gap-1 border-t border-slate-200/70 px-4 py-3 lg:hidden sm:px-6">
          {links.map((link) => navLink(link.href, link.label, true))}
        </nav>
      )}
    </header>
  );
}
