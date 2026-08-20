import { auth } from "@/lib/auth";
import { updateDisplayName, changePassword } from "@/services/admin";
import { withApiError } from "@/lib/apiRoute";

export const PUT = withApiError(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = session.user.id;

  // Name update
  if ("name" in body) {
    const result = await updateDisplayName(userId, body.name);
    if (result.error) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ data: { name: result.name } });
  }

  // Password update
  if ("currentPassword" in body && "newPassword" in body) {
    const result = await changePassword(userId, body.currentPassword, body.newPassword);
    if (result.error) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ data: { message: result.message } });
  }

  return Response.json({ error: "Nothing to update" }, { status: 400 });
});
