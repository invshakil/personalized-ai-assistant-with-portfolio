import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AccountPage from "./AccountPage";

export const metadata = { title: "Account" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/admin/login");

  return <AccountPage initialName={user.name ?? ""} email={user.email ?? ""} />;
}
