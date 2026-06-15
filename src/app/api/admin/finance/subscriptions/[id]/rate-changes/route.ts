import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { addRateChange } from "@/services/finance";

// POST { effectiveMonth, monthlyAmount, note? } → add/update an effective-dated
// price change for the subscription.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { effectiveMonth, monthlyAmount, note } = body;

  if (!effectiveMonth || monthlyAmount == null) {
    return Response.json(
      { error: "effectiveMonth and monthlyAmount are required" },
      { status: 400 }
    );
  }
  if (Number(monthlyAmount) < 0) {
    return Response.json({ error: "monthlyAmount must be ≥ 0" }, { status: 400 });
  }

  const data = await addRateChange(id, {
    effectiveMonth,
    monthlyAmount: Number(monthlyAmount),
    note,
  });
  return Response.json({ data });
}
