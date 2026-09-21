"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";

export function ListingEditForm({ listing }: { listing: Listing }) {
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
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-medium">Edit listing</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Ref</label><input name="listing_ref" className="input" defaultValue={listing.listing_ref} required /></div>
        <div><label className="label">Status</label>
          <select name="status" className="input" defaultValue={listing.status}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div><label className="label">Title</label><input name="title" className="input" defaultValue={listing.title} required /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">City</label><input name="city" className="input" defaultValue={listing.city || ""} /></div>
        <div><label className="label">Locality</label><input name="locality" className="input" defaultValue={listing.locality || ""} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Type</label><input name="property_type" className="input" defaultValue={listing.property_type || ""} /></div>
        <div><label className="label">Beds</label><input name="beds" type="number" className="input" defaultValue={listing.beds ?? ""} /></div>
        <div><label className="label">Size</label><input name="size_text" className="input" defaultValue={listing.size_text || ""} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Price min</label><input name="price_min" type="number" className="input" defaultValue={listing.price_min_minor != null ? listing.price_min_minor / 100 : ""} /></div>
        <div><label className="label">Price max</label><input name="price_max" type="number" className="input" defaultValue={listing.price_max_minor != null ? listing.price_max_minor / 100 : ""} /></div>
        <div><label className="label">Currency</label><input name="currency" className="input" defaultValue={listing.currency} /></div>
      </div>
      <div><label className="label">Public URL</label><input name="public_url" className="input" defaultValue={listing.public_url || ""} /></div>
      <div><label className="label">Description</label><textarea name="description" className="input" rows={3} defaultValue={listing.description || ""} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
