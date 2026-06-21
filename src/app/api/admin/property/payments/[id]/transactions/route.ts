import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getTransactions, addTransaction } from "@/services/property";
import { TransactionType } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getTransactions(id);
  return Response.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: paymentId } = await params;
  const body = await req.json();
  const { type, amount, date, notes, accountId } = body as {
    type: TransactionType;
    amount: number;
    date: string;
    notes?: string;
    accountId?: string;
  };

  if (!type || !amount || !date) {
    return Response.json({ error: "type, amount, and date are required" }, { status: 400 });
  }

  try {
    const data = await addTransaction({ paymentId, type, amount, date, notes, accountId });
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
