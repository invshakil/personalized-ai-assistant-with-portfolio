import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { withApiError } from "@/lib/apiRoute";
import { convertEarnings } from "@/services/finance";
import { isoDayParam } from "@/services/_shared/listQuery";

/** A JSON number, or a plain decimal string — never `true`, `[7]` or "0x1F". */
function strictNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && /^\d{1,12}(\.\d{1,6})?$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 64;

// POST /api/admin/finance/earnings/convert — convert money out of a foreign
// account at the actual rate, posting one cross-currency Money transfer. Into a
// BDT account the pending earnings it covers are realized as income; into
// another foreign account (EUR→USD) they are re-denominated and stay pending.
export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid conversion request" }, { status: 400 });
  }
  const { currency, fromAccountId, toAccountId, notes } = body;
  const amount = strictNumber(body.amount);
  const toAmount = strictNumber(body.toAmount);
  const date = typeof body.date === "string" ? isoDayParam(body.date) : undefined;

  if (typeof currency !== "string" || !/^[A-Za-z]{3}$/.test(currency)) {
    return Response.json({ error: "currency must be a 3-letter code" }, { status: 400 });
  }
  if (amount == null || toAmount == null) {
    return Response.json({ error: "amount and toAmount must be numbers" }, { status: 400 });
  }
  if (!isId(fromAccountId) || !isId(toAccountId)) {
    return Response.json({ error: "fromAccountId and toAccountId are required" }, { status: 400 });
  }
  if (!date) return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  if (notes != null && typeof notes !== "string") {
    return Response.json({ error: "notes must be text" }, { status: 400 });
  }

  const data = await convertEarnings({
    currency,
    amount,
    fromAccountId,
    toAccountId,
    date,
    toAmount,
    notes: notes ?? null,
  });
  return Response.json({ data }, { status: 201 });
});
