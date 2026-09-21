"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Listing = { id: string; listing_ref: string; title: string; status: string };
type Member = { id: string; name: string };

export default function NewInquiryPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/listings?status=all").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([l, u, m]) => {
      setListings((l.listings || []).filter((x: Listing) => x.status !== "archived"));
      setMembers((u.users || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setMe(m.user?.id || "");
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || "") || null,
      source: String(fd.get("source") || "whatsapp"),
      source_detail: String(fd.get("source_detail") || "") || null,
      owner_id: String(fd.get("owner_id") || me),
      listing_id: String(fd.get("listing_id") || "") || null,
      preferred_locality: String(fd.get("preferred_locality") || "") || null,
      property_type: String(fd.get("property_type") || "") || null,
      bedrooms: fd.get("bedrooms") ? Number(fd.get("bedrooms")) : null,
      budget_min_minor: fd.get("budget_min") ? Math.round(Number(fd.get("budget_min")) * 100) : null,
      budget_max_minor: fd.get("budget_max") ? Math.round(Number(fd.get("budget_max")) * 100) : null,
      currency: String(fd.get("currency") || "PKR"),
      message: String(fd.get("message") || "") || null,
      next_follow_up_at: String(fd.get("next_follow_up_at") || "")
        ? new Date(String(fd.get("next_follow_up_at"))).toISOString()
        : null,
    };
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    router.push(`/inquiries/${data.inquiry.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">New inquiry</h1>
      <form onSubmit={onSubmit} className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Name *</label><input name="name" className="input" required /></div>
          <div><label className="label">Phone *</label><input name="phone" className="input" required placeholder="03001234567" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Email</label><input name="email" type="email" className="input" /></div>
          <div><label className="label">Source *</label>
            <select name="source" className="input" defaultValue="whatsapp">
              <option value="whatsapp">WhatsApp</option>
              <option value="portal">Portal</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="phone">Phone</option>
              <option value="walk_in">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div><label className="label">Source detail</label><input name="source_detail" className="input" placeholder="Zameen / campaign" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Listing</label>
            <select name="listing_id" className="input" defaultValue="">
              <option value="">— None —</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.listing_ref} — {l.title}</option>)}
            </select>
          </div>
          <div><label className="label">Owner *</label>
            <select name="owner_id" className="input" value={me} onChange={(e) => setMe(e.target.value)} required>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Locality</label><input name="preferred_locality" className="input" /></div>
          <div><label className="label">Type</label><input name="property_type" className="input" /></div>
          <div><label className="label">Beds</label><input name="bedrooms" type="number" className="input" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Budget min</label><input name="budget_min" type="number" className="input" /></div>
          <div><label className="label">Budget max</label><input name="budget_max" type="number" className="input" /></div>
          <div><label className="label">Currency</label><input name="currency" className="input" defaultValue="PKR" /></div>
        </div>
        <div><label className="label">Next follow-up</label><input name="next_follow_up_at" type="datetime-local" className="input" /></div>
        <div><label className="label">Message</label><textarea name="message" className="input" rows={3} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving…" : "Create inquiry"}</button>
      </form>
    </div>
  );
}
