import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getEarnings, createEarning } from "@/services/finance";
import { RemittanceType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const data = await getEarnings({ fiscalYear, sourceId, period, from, to, q });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, sourceId, remittance, amount, fiscalYear, notes, accountId } = body;

  if (!date || !sourceId || amount == null) {
    return Response.json({ error: "date, sourceId and amount are required" }, { status: 400 });
  }
  if (remittance && !(remittance in RemittanceType)) {
    return Response.json({ error: "remittance must be REM or NON_REM" }, { status: 400 });
  }

  const data = await createEarning({
    date,
    sourceId,
    remittance: (remittance as RemittanceType) ?? RemittanceType.NON_REM,
    amount: Number(amount),
    fiscalYear,
    notes,
    accountId: accountId || undefined,
  });
  return Response.json({ data }, { status: 201 });
}
