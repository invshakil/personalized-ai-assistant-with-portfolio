import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { withApiError } from "@/lib/apiRoute";
import { reverseConversion } from "@/services/finance";

// POST /api/admin/finance/earnings/[id]/reverse-conversion — undo the conversion
// that realized this earning, or the exchange that re-denominated it (and its
// whole batch); removes the ledger transfer.
export const POST = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await reverseConversion(id);
    return Response.json({ data });
  }
);
