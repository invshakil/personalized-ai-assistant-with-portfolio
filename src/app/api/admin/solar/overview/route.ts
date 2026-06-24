import { auth } from "@/lib/auth";
import { getSolarOverview } from "@/services/solar";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getSolarOverview();
  return Response.json({ data });
}
