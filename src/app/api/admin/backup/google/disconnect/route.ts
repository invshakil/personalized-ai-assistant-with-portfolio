import { auth } from "@/lib/auth";
import { clearDriveConnection } from "@/services/admin";
import { revokeToken } from "@/services/admin/googleDrive";

// POST → disconnect Google Drive (clears the stored token + revokes it).
export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await clearDriveConnection();
  if (token) await revokeToken(token);
  return Response.json({ data: { disconnected: true } });
}
