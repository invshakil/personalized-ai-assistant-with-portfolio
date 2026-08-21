import { auth } from "@/lib/auth";
import { listChatSessions, createChatSession } from "@/services/ai";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await listChatSessions();
  return Response.json({ data });
}

export const POST = withApiError(async () => {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await createChatSession();
  return Response.json({ data });
});
