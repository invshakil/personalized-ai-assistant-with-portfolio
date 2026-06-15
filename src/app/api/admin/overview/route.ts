import { auth } from "@/lib/auth";
import { getAdminOverview } from "@/services/admin";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getAdminOverview();
  return Response.json({ data });
}
