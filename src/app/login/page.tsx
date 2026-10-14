"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@listingloop.local");
  const [password, setPassword] = useState("owner12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="brand-mark h-11 w-11 rounded-2xl" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3.5 10.5 8.5-7 8.5 7V21h-17V10.5Z" />
            <path d="M9 21v-7h6v7M3.5 10.5 12 3.5l8.5 7" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">
            Listing<span className="text-emerald-800">Loop</span> Desk
          </p>
          <p className="page-eyebrow mt-0.5">Broker workspace</p>
        </div>
      </div>

      <section className="card p-5 sm:p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email"
              name="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="label">Password</label>
            <input
              id="login-password"
              name="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p id="login-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          First time? <Link href="/register" className="font-semibold text-emerald-800 hover:underline">Create workspace</Link>
        </p>
      </section>
    </main>
  );
}
