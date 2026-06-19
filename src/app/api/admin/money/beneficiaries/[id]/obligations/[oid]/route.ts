import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateObligation, deleteObligation } from "@/services/money";
import { ObligationDirection, ObligationStatus, ObligationType } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ oid: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { oid } = await params;
  const body = await req.json();
  if (body.type && !(body.type in ObligationType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (body.direction && !(body.direction in ObligationDirection)) {
    return Response.json({ error: "invalid direction" }, { status: 400 });
  }
  if (body.status && !(body.status in ObligationStatus)) {
    return Response.json({ error: "invalid status" }, { status: 400 });
  }
  const data = await updateObligation(oid, {
    ...body,
    ...(body.amount != null && { amount: Number(body.amount) }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ oid: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { oid } = await params;
  const data = await deleteObligation(oid);
  return Response.json({ data });
}
