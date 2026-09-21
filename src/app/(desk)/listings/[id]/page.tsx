import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getListing } from "@/lib/listings";
import { listInquiries } from "@/lib/inquiries";
import { formatMoney, formatDateTime } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/types";
import { ListingEditForm } from "@/components/ListingEditForm";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const listing = getListing(user, id);
  if (!listing) notFound();
  const inquiries = listInquiries(user, { listing_id: id });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/listings" className="hover:text-indigo-700">Listings</Link>
        <span>/</span>
        <span>{listing.listing_ref}</span>
      </div>
      <h1 className="text-xl font-semibold">{listing.title}</h1>
      <p className="text-sm text-slate-500">
        {[listing.city, listing.locality].filter(Boolean).join(" · ")} · {listing.status} ·{" "}
        {formatMoney(listing.price_min_minor, listing.currency)} – {formatMoney(listing.price_max_minor, listing.currency)}
      </p>
      <ListingEditForm listing={listing} />
      <section className="card">
        <h2 className="mb-2 font-medium">Linked inquiries ({inquiries.length})</h2>
        <ul className="space-y-1">
          {inquiries.map((i) => (
            <li key={i.id}>
              <Link href={`/inquiries/${i.id}`} className="text-sm text-indigo-700 hover:underline">
                {i.name} · {STAGE_LABELS[i.stage]} · {formatDateTime(i.updated_at)}
              </Link>
            </li>
          ))}
          {inquiries.length === 0 && <p className="text-sm text-slate-400">None yet</p>}
        </ul>
      </section>
    </div>
  );
}
