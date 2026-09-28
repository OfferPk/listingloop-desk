import { redirect } from "next/navigation";
import { AuthError, requireManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager();
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.status === 401) redirect("/login");
      redirect("/dashboard");
    }
    throw e;
  }
  return <>{children}</>;
}
