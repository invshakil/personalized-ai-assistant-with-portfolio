import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateEarning, deleteEarning } from "@/services/finance";
import { RemittanceType } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (body.remittance && !(body.remittance in RemittanceType)) {
    return Response.json({ error: "remittance must be REM or NON_REM" }, { status: 400 });
  }
  const data = await updateEarning(id, {
    ...body,
    ...(body.amount != null && { amount: Number(body.amount) }),
    ...(body.remittance && { remittance: body.remittance as RemittanceType }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteEarning(id);
  return Response.json({ data });
}
