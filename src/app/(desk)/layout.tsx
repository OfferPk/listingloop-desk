import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4">{children}</main>
    </div>
  );
}
