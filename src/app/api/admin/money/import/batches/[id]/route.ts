import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { deleteImportBatch } from "@/services/money";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteImportBatch(id);
  return Response.json({ data });
}
