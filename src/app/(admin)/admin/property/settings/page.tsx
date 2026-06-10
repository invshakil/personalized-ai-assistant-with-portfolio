import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPropertySettings } from "@/services/property";
import PropertySettingsPage from "./PropertySettingsPage";

export const metadata = { title: "Property Settings" };

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const raw = await getPropertySettings();
  const settings = { ...raw, updatedAt: raw.updatedAt.toISOString() };
  return <PropertySettingsPage initial={settings} />;
}
