import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listAccountTypes, createAccountType } from "@/services/money";
import { MoneyAccountType } from "@prisma/client";
import { withApiError } from "@/lib/apiRoute";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listAccountTypes();
  return Response.json({ data });
}

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, kind } = await req.json();
  if (typeof name !== "string" || !name.trim() || !kind) {
    return Response.json({ error: "name and kind are required" }, { status: 400 });
  }
  if (!(kind in MoneyAccountType)) {
    return Response.json({ error: "invalid kind" }, { status: 400 });
  }

  const data = await createAccountType({ name, kind: kind as MoneyAccountType });
  return Response.json({ data }, { status: 201 });
});
