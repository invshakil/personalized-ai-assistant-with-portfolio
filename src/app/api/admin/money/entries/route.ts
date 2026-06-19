import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getEntries, createEntry } from "@/services/money";
import type { EntrySortBy, EntrySortDir } from "@/services/money";
import { MoneyEntryDirection } from "@prisma/client";

const SORT_BY: EntrySortBy[] = ["date", "amount", "category"];
const SORT_DIR: EntrySortDir[] = ["asc", "desc"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const directionParam = searchParams.get("direction") ?? undefined;
  const direction =
    directionParam && directionParam in MoneyEntryDirection
      ? (directionParam as MoneyEntryDirection)
      : undefined;
  const limitParam = searchParams.get("limit");

  const sortByParam = searchParams.get("sortBy");
  const sortBy =
    sortByParam && SORT_BY.includes(sortByParam as EntrySortBy)
      ? (sortByParam as EntrySortBy)
      : undefined;
  const sortDirParam = searchParams.get("sortDir");
  const sortDir =
    sortDirParam && SORT_DIR.includes(sortDirParam as EntrySortDir)
      ? (sortDirParam as EntrySortDir)
      : undefined;

  const data = await getEntries({
    period: searchParams.get("period") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    accountId: searchParams.get("accountId") ?? undefined,
    beneficiaryId: searchParams.get("beneficiaryId") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    direction,
    sortBy,
    sortDir,
    limit: limitParam ? Number(limitParam) : undefined,
  });
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
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
