import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listAccountsWithBalances, createAccount } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listAccountsWithBalances();
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, openingBalance, creditLimit, isActive, notes } = body;
  if (!name || !type) {
    return Response.json({ error: "name and type are required" }, { status: 400 });
  }
  if (!(type in MoneyAccountType)) {
    return Response.json({ error: "invalid account type" }, { status: 400 });
  }

  const data = await createAccount({
    name,
    type: type as MoneyAccountType,
    openingBalance: openingBalance != null ? Number(openingBalance) : 0,
    creditLimit: creditLimit != null ? Number(creditLimit) : null,
    isActive,
    notes,
  });
  return Response.json({ data }, { status: 201 });
}
