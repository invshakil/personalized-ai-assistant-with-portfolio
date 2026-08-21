import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getChatSession, renameChatSession, deleteChatSession } from "@/services/ai";
import { withApiError } from "@/lib/apiRoute";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getChatSession(id);
  if (!data) return Response.json({ error: "Conversation not found" }, { status: 404 });
  return Response.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (typeof body.title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  try {
    await renameChatSession(id, body.title);
    return Response.json({ data: { ok: true } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to rename." },
      { status: 400 }
    );
  }
}

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteChatSession(id);
    return Response.json({ data: { ok: true } });
  }
);
