import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listListings } from "@/lib/listings";
import { formatMoney } from "@/lib/format";

export default async function ListingsPage() {
  const user = await requireUser();
  const listings = listListings(user, { status: "all" });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Listings</h1>
        <Link href="/listings/new" className="btn-primary">+ New listing</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-slate-500">
            <tr>
              <th className="py-2 pr-2">Ref</th>
              <th className="py-2 pr-2">Title</th>
              <th className="py-2 pr-2">City / Locality</th>
              <th className="py-2 pr-2">Price</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Inquiries</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <Link href={`/listings/${l.id}`} className="font-medium text-indigo-700 hover:underline">
                    {l.listing_ref}
                  </Link>
                </td>
                <td className="py-2 pr-2">{l.title}</td>
                <td className="py-2 pr-2 text-slate-600">{[l.city, l.locality].filter(Boolean).join(" · ") || "—"}</td>
                <td className="py-2 pr-2">
                  {l.price_min_minor != null || l.price_max_minor != null
                    ? `${formatMoney(l.price_min_minor, l.currency)} – ${formatMoney(l.price_max_minor, l.currency)}`
                    : "—"}
                </td>
                <td className="py-2 pr-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{l.status}</span></td>
                <td className="py-2">{l.inquiry_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {listings.length === 0 && <p className="py-4 text-sm text-slate-400">No listings yet.</p>}
      </div>
    </div>
  );
}
