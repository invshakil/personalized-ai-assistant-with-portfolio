import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { setMonthOverride, clearMonthOverride } from "@/services/finance";
import { withApiError } from "@/lib/apiRoute";

// PUT    { month, amount, note? } → set/replace a per-month amount override
// DELETE { month }                → clear the override (revert to scheduled rate)
export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { month, amount, note } = body;

    if (!month || amount == null) {
      return Response.json({ error: "month and amount are required" }, { status: 400 });
    }
    if (Number(amount) < 0) {
      return Response.json({ error: "amount must be ≥ 0" }, { status: 400 });
    }

    const data = await setMonthOverride(id, { month, amount: Number(amount), note });
    return Response.json({ data });
  }
);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.month) {
    return Response.json({ error: "month is required" }, { status: 400 });
  }

  const data = await clearMonthOverride(id, body.month);
  return Response.json({ data });
}
