import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { deleteSettlement } from "@/services/trips";

// DELETE a settlement.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, sid } = await params;
  try {
    const data = await deleteSettlement(id, sid);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
