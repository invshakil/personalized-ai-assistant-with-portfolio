import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { reverseConversion } from "@/services/finance";

// POST /api/admin/finance/earnings/[id]/reverse-conversion — undo the conversion
// that realized this earning (and its batch); removes the ledger transfer.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await reverseConversion(id);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
