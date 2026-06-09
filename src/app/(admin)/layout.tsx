import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell
      userName={session.user.name ?? null}
      userEmail={session.user.email ?? null}
    >
      {children}
    </AdminShell>
  );
}
