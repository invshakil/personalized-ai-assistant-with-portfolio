import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateEmployeePayment, deleteEmployeePayment } from "@/services/finance";
import { PaymentKind } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (body.type && !(body.type in PaymentKind)) {
    return Response.json(
      { error: "type must be SALARY, BONUS, ADVANCE or OTHER" },
      { status: 400 }
    );
  }
  const data = await updateEmployeePayment(id, {
    ...body,
    ...(body.amount != null && { amount: Number(body.amount) }),
    ...(body.originalAmount != null && { originalAmount: Number(body.originalAmount) }),
    ...(body.fxRate != null && { fxRate: Number(body.fxRate) }),
    ...(body.currency && { currency: String(body.currency) }),
    ...(body.type && { type: body.type as PaymentKind }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteEmployeePayment(id);
  return Response.json({ data });
}
