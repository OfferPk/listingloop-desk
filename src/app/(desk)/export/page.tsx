import { redirect } from "next/navigation";
import { requireUser, isManagerOrOwner } from "@/lib/auth";
import { ExportInquiriesForm } from "@/components/ExportInquiriesForm";

export default async function ExportPage() {
  const user = await requireUser();
  if (!isManagerOrOwner(user.role)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Export</h1>
        <p className="text-sm text-slate-500">
          Download inquiry CSV with stage + date filters — seat-justification pack.
        </p>
      </div>
      <ExportInquiriesForm />
    </div>
  );
}
