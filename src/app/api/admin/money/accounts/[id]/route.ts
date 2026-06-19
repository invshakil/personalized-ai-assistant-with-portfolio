import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateAccount, deleteAccount } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (body.type && !(body.type in MoneyAccountType)) {
    return Response.json({ error: "invalid account type" }, { status: 400 });
  }
  const data = await updateAccount(id, {
    ...body,
    ...(body.type && { type: body.type as MoneyAccountType }),
    ...(body.openingBalance != null && { openingBalance: Number(body.openingBalance) }),
    ...(body.creditLimit !== undefined && {
      creditLimit: body.creditLimit == null ? null : Number(body.creditLimit),
    }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteAccount(id);
  return Response.json({ data });
}
