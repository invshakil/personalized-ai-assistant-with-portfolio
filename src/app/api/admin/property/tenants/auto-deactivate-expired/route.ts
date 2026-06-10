import { auth } from "@/lib/auth";
import { autoDeactivateExpired } from "@/services/property";

export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await autoDeactivateExpired();
  return Response.json({ data });
}
