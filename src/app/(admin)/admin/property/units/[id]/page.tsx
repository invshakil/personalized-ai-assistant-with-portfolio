import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UnitDetailPage from "./UnitDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  return <UnitDetailPage unitId={id} />;
}
