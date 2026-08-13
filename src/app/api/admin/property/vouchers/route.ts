import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getVouchers, createVoucher } from "@/services/property";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const data = await getVouchers({
    tenantId: searchParams.get("tenantId") ?? undefined,
    month: monthParam ? Number(monthParam) : undefined,
    year: yearParam ? Number(yearParam) : undefined,
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tenantId, label, amount, month, year, notes } = body as {
    tenantId?: string;
    label?: string;
    amount?: number;
    month?: number;
    year?: number;
    notes?: string;
  };

  if (!tenantId || !label || amount == null || !month || !year) {
    return Response.json(
      { error: "tenantId, label, amount, month, and year are required" },
      { status: 400 }
    );
  }

  try {
    const data = await createVoucher({ tenantId, label, amount, month, year, notes });
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
