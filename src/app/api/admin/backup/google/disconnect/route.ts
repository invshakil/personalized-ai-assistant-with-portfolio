import { auth } from "@/lib/auth";
import { clearDriveConnection } from "@/services/admin";
import { revokeToken } from "@/services/admin/googleDrive";
import { withApiError } from "@/lib/apiRoute";

// POST → disconnect Google Drive (clears the stored token + revokes it).
export const POST = withApiError(async () => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await clearDriveConnection();
  // Revoke at Google too; if that fails the token may still be live there, so
  // tell the user to remove access manually rather than silently swallowing it.
  const revoked = token ? await revokeToken(token) : true;
  return Response.json({
    data: {
      disconnected: true,
      revoked,
      ...(revoked
        ? {}
        : {
            warning:
              "Disconnected locally, but revoking access at Google failed. Remove it manually at https://myaccount.google.com/permissions",
          }),
    },
  });
});
