"use client";
import { useEffect, useState } from "react";

type Row = { id: string; email: string; name: string; role: string; status: string; membership_id: string };

export default function TeamPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "agent" });

  function load() {
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
  }
  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Failed"); return; }
    setForm({ name: "", email: "", password: "", role: "agent" });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Team</h1>
      <div className="card">
        <ul className="divide-y text-sm">
          {users.map((u) => (
            <li key={u.membership_id} className="flex justify-between py-2">
              <span>{u.name} · {u.email}</span>
              <span className="text-xs text-slate-500">{u.role} · {u.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={invite} className="card space-y-3 max-w-lg">
        <h2 className="font-medium">Invite user</h2>
        <p className="text-xs text-slate-500">Owners and managers can invite. Seed users already cover demo roles.</p>
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="password" placeholder="Temp password (min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="agent">Agent</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "…" : "Invite"}</button>
      </form>
    </div>
  );
}
