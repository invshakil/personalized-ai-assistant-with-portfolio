import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listAccountsWithBalances, createAccount } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listAccountsWithBalances();
  return Response.json({ data });
}

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, accountTypeId, currency, openingBalance, creditLimit, isActive, notes } =
    body;
  if (!name || (!type && !accountTypeId)) {
    return Response.json({ error: "name and accountTypeId are required" }, { status: 400 });
  }
  if (type && !(type in MoneyAccountType)) {
    return Response.json({ error: "invalid account type" }, { status: 400 });
  }

  const data = await createAccount({
    name,
    accountTypeId: typeof accountTypeId === "string" ? accountTypeId : null,
    type: type ? (type as MoneyAccountType) : null,
    currency: typeof currency === "string" ? currency : undefined,
    openingBalance: openingBalance != null ? Number(openingBalance) : 0,
    creditLimit: creditLimit != null ? Number(creditLimit) : null,
    isActive,
    notes,
  });
  return Response.json({ data }, { status: 201 });
});
