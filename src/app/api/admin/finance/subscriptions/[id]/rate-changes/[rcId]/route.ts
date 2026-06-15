import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { deleteRateChange } from "@/services/finance";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rcId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rcId } = await params;
  const data = await deleteRateChange(rcId);
  return Response.json({ data });
}
