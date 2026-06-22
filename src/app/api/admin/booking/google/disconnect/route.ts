import { auth } from "@/lib/auth";
import { clearGoogleConnection, revokeToken } from "@/services/booking";

export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await clearGoogleConnection();
  if (token) await revokeToken(token); // best-effort
  return Response.json({ data: { ok: true } });
}
