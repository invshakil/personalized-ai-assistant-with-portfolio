// Shared request-body parsing for the trip-expense routes (POST create + PUT
// update use the same full-definition payload). Basic shaping/guards only — the
// service (createTripExpense/updateTripExpense) does the deep validation.
import { TripCategory, TripSplitMode } from "@prisma/client";
import type { TripExpenseInput } from "@/services/trips";

export interface RawExpenseBody {
  category?: string;
  date?: string;
  description?: string | null;
  payerId?: string;
  splitMode?: string;
  shares?: Array<{ participantId?: string; amount?: number }>;
  accountId?: string | null;
  amount?: number;
  currency?: string;
  fxRate?: number;
}

export function parseExpenseBody(
  body: RawExpenseBody | null
): { input: Omit<TripExpenseInput, "tripId"> } | { error: string } {
  if (!body) return { error: "Invalid body" };
  if (!body.category || !Object.prototype.hasOwnProperty.call(TripCategory, body.category))
    return { error: "Valid category is required" };
  if (!body.payerId) return { error: "payerId is required" };
  if (!Array.isArray(body.shares) || body.shares.length === 0)
    return { error: "At least one participant must share the expense" };
  if (body.splitMode && !Object.prototype.hasOwnProperty.call(TripSplitMode, body.splitMode))
    return { error: "Invalid splitMode" };
  const shares = body.shares.map((s) => ({
    participantId: String(s.participantId),
    ...(s.amount != null && { amount: Number(s.amount) }),
  }));
  return {
    input: {
      category: body.category as TripCategory,
      date: String(body.date),
      description: body.description ?? null,
      payerId: String(body.payerId),
      ...(body.splitMode && { splitMode: body.splitMode as TripSplitMode }),
      shares,
      accountId: body.accountId ? String(body.accountId) : null,
      amount: Number(body.amount),
      ...(body.currency && { currency: String(body.currency) }),
      ...(body.fxRate != null && { fxRate: Number(body.fxRate) }),
    },
  };
}
