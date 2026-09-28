"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, workspace_name: workspaceName }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="card">
        <h1 className="mb-1 text-xl font-semibold text-indigo-700">Create workspace</h1>
        <p className="mb-4 text-sm text-slate-500">First user becomes the owner</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Your name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Workspace name</label>
            <input className="input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="e.g. Karachi Homes" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password (min 10)</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Creating…" : "Create workspace"}</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account? <Link href="/login" className="text-indigo-600">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
