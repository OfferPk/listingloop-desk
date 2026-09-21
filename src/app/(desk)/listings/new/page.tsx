"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewListingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      listing_ref: String(fd.get("listing_ref") || ""),
      title: String(fd.get("title") || ""),
      city: String(fd.get("city") || "") || null,
      locality: String(fd.get("locality") || "") || null,
      property_type: String(fd.get("property_type") || "") || null,
      beds: fd.get("beds") ? Number(fd.get("beds")) : null,
      size_text: String(fd.get("size_text") || "") || null,
      price_min_minor: fd.get("price_min") ? Math.round(Number(fd.get("price_min")) * 100) : null,
      price_max_minor: fd.get("price_max") ? Math.round(Number(fd.get("price_max")) * 100) : null,
      currency: String(fd.get("currency") || "PKR"),
      public_url: String(fd.get("public_url") || "") || null,
      description: String(fd.get("description") || "") || null,
      status: String(fd.get("status") || "active"),
    };
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    router.push(`/listings/${data.listing.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">New listing</h1>
      <form onSubmit={onSubmit} className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Listing ref *</label><input name="listing_ref" className="input" required placeholder="DHA-A1" /></div>
          <div><label className="label">Status</label>
            <select name="status" className="input" defaultValue="active">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div><label className="label">Title *</label><input name="title" className="input" required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">City</label><input name="city" className="input" placeholder="Karachi" /></div>
          <div><label className="label">Locality</label><input name="locality" className="input" placeholder="DHA Phase 6" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Type</label><input name="property_type" className="input" placeholder="Apartment" /></div>
          <div><label className="label">Beds</label><input name="beds" type="number" className="input" /></div>
          <div><label className="label">Size</label><input name="size_text" className="input" placeholder="1200 sqft" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Price min (major)</label><input name="price_min" type="number" className="input" /></div>
          <div><label className="label">Price max (major)</label><input name="price_max" type="number" className="input" /></div>
          <div><label className="label">Currency</label><input name="currency" className="input" defaultValue="PKR" /></div>
        </div>
        <div><label className="label">Public URL</label><input name="public_url" className="input" /></div>
        <div><label className="label">Description</label><textarea name="description" className="input" rows={3} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving…" : "Create listing"}</button>
      </form>
    </div>
  );
}
