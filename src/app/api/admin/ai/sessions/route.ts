import { auth } from "@/lib/auth";
import { listChatSessions, createChatSession } from "@/services/ai";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await listChatSessions();
  return Response.json({ data });
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await createChatSession();
  return Response.json({ data });
}
