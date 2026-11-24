import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getEntries, createEntry, parseEntryQuery } from "@/services/money";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getEntries(parseEntryQuery(new URL(req.url).searchParams));
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, direction, amount, categoryId } = body;
  if (!date || !direction || amount == null || !categoryId) {
    return Response.json(
      { error: "date, direction, amount and categoryId are required" },
      { status: 400 }
    );
  }
  if (direction !== "CREDIT" && direction !== "DEBIT") {
    return Response.json(
      { error: "direction must be CREDIT or DEBIT (use /transfers for transfers)" },
      { status: 400 }
    );
  }

  try {
    const data = await createEntry({
      date,
      direction,
      amount: Number(amount),
      categoryId,
      accountId: body.accountId ?? null,
      beneficiaryId: body.beneficiaryId ?? null,
      obligationId: body.obligationId ?? null,
      description: body.description ?? null,
      notes: body.notes ?? null,
      method: body.method ?? null,
      fee: body.fee == null || body.fee === "" ? undefined : Number(body.fee),
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
