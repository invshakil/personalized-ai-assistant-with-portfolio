import { auth } from "@/lib/auth";
import { getUsageSummary } from "@/services/ai";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getUsageSummary() });
}
