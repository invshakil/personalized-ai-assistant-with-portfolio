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

  const data = await getEmployeePayments({ fiscalYear, employeeId });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, employeeId, type, reference, clientIds, amount, fiscalYear, notes } = body;

  if (!date || !employeeId || amount == null) {
    return Response.json({ error: "date, employeeId and amount are required" }, { status: 400 });
  }
  if (type && !(type in PaymentKind)) {
    return Response.json({ error: "type must be SALARY, BONUS, ADVANCE or OTHER" }, { status: 400 });
  }

  const data = await createEmployeePayment({
    date,
    employeeId,
    type: (type as PaymentKind) ?? PaymentKind.SALARY,
    reference,
    clientIds: Array.isArray(clientIds) ? clientIds : undefined,
    amount: Number(amount),
    fiscalYear,
    notes,
  });
  return Response.json({ data }, { status: 201 });
}
