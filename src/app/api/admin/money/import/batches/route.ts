import { auth } from "@/lib/auth";
import { listImportBatches } from "@/services/money";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listImportBatches();
  return Response.json({ data });
}
