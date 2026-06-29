import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getEmployeePayments, createEmployeePayment } from "@/services/finance";
import { PaymentKind } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;
  // Only accept a valid PaymentKind; ignore anything else (e.g. "ALL").
  const type =
    typeParam && Object.values(PaymentKind).includes(typeParam as PaymentKind)
      ? (typeParam as PaymentKind)
      : undefined;

  const data = await getEmployeePayments({
    fiscalYear,
    employeeId,
    clientId,
    type,
    period,
    from,
    to,
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    date,
    employeeId,
    type,
    reference,
    clientIds,
    amount,
    currency,
    originalAmount,
    fxRate,
    fiscalYear,
    notes,
    accountId,
  } = body;

  const amountSource = originalAmount ?? amount;
  if (!date || !employeeId || amountSource == null) {
    return Response.json({ error: "date, employeeId and amount are required" }, { status: 400 });
  }
  if (type && !(type in PaymentKind)) {
    return Response.json(
      { error: "type must be SALARY, BONUS, ADVANCE or OTHER" },
      { status: 400 }
    );
  }

  const data = await createEmployeePayment({
    date,
    employeeId,
    type: (type as PaymentKind) ?? PaymentKind.SALARY,
    reference,
    clientIds: Array.isArray(clientIds) ? clientIds : undefined,
    ...(amount != null && { amount: Number(amount) }),
    ...(currency && { currency: String(currency) }),
    ...(originalAmount != null && { originalAmount: Number(originalAmount) }),
    ...(fxRate != null && { fxRate: Number(fxRate) }),
    fiscalYear,
    notes,
    accountId: accountId || undefined,
  });
  return Response.json({ data }, { status: 201 });
}
