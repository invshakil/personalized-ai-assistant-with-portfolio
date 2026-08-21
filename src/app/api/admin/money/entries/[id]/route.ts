import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateEntry, deleteEntry } from "@/services/money";
import { withApiError } from "@/lib/apiRoute";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (body.direction && body.direction !== "CREDIT" && body.direction !== "DEBIT") {
    return Response.json({ error: "direction must be CREDIT or DEBIT" }, { status: 400 });
  }
  try {
    const data = await updateEntry(id, {
      ...body,
      ...(body.amount != null && { amount: Number(body.amount) }),
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await deleteEntry(id);
    return Response.json({ data });
  }
);
