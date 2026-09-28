"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const BASE_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/today", label: "Today" },
  { href: "/listings", label: "Listings" },
  { href: "/inquiries/new", label: "New inquiry" },
];

const MANAGER_LINKS = [
  { href: "/imports", label: "Import" },
  { href: "/export", label: "Export" },
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-semibold text-indigo-700">
            ListingLoop
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm ${
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "bg-indigo-50 font-medium text-indigo-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {user.name} · {user.role}
          </span>
          {(user.role === "owner" || user.role === "manager") && (
            <Link href="/export" className="btn-secondary hidden text-xs sm:inline-flex">
              Export CSV
            </Link>
          )}
          <button type="button" onClick={logout} disabled={busy} className="btn-secondary text-xs">
            Log out
          </button>
          <button type="button" className="btn-secondary md:hidden" onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-100 px-3 py-2 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
