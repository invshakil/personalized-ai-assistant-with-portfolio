// Trip settlements — money moving between two participants: a "collect fund"
// contribution (friend → organiser) or a settle-up (anyone → anyone). Pure trip
// ledger: a settlement NEVER creates a MoneyEntry, so group money is tracked
// separately from personal net worth (a decision locked with the user). Foreign
// amounts are canonicalized to BDT for the who-owes-whom netting.
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getFxRateToBdt } from "@/services/_shared/fx";
import { toNum, toIso, money2 } from "./_serializers";
import type { TripSettlementRow } from "@/types";

const SETTLEMENT_INCLUDE = {
  from: { select: { name: true } },
  to: { select: { name: true } },
} satisfies Prisma.TripSettlementInclude;

type SettlementWith = Prisma.TripSettlementGetPayload<{ include: typeof SETTLEMENT_INCLUDE }>;

function serialize(s: SettlementWith): TripSettlementRow {
  return {
    id: s.id,
    tripId: s.tripId,
    date: toIso(s.date)!,
    fromParticipantId: s.fromParticipantId,
    fromName: s.from.name,
    toParticipantId: s.toParticipantId,
    toName: s.to.name,
    amount: toNum(s.amount),
    currency: s.currency,
    fxRate: s.fxRate == null ? null : toNum(s.fxRate),
    amountBdt: toNum(s.amountBdt),
    note: s.note,
  };
}

export async function listSettlements(tripId: string): Promise<TripSettlementRow[]> {
  const rows = await db.tripSettlement.findMany({
    where: { tripId },
    include: SETTLEMENT_INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(serialize);
}

export interface CreateSettlementInput {
  tripId: string;
  date: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency?: string;
  fxRate?: number;
  note?: string | null;
}

export async function createSettlement(input: CreateSettlementInput): Promise<TripSettlementRow> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("amount must be a finite number greater than 0");
  if (Number.isNaN(new Date(input.date).getTime())) throw new Error("date is not a valid date");
  if (input.fromParticipantId === input.toParticipantId)
    throw new Error("A settlement must be between two different people");

  const people = await db.tripParticipant.count({
    where: { id: { in: [input.fromParticipantId, input.toParticipantId] }, tripId: input.tripId },
  });
  if (people !== 2) throw new Error("Both people must be participants of this trip");

  const currency = (input.currency ?? "BDT").toUpperCase();
  const fxRate =
    currency === "BDT"
      ? 1
      : input.fxRate && input.fxRate > 0
        ? input.fxRate
        : (await getFxRateToBdt(currency)).rate || 1;

  const s = await db.tripSettlement.create({
    data: {
      tripId: input.tripId,
      date: new Date(input.date),
      fromParticipantId: input.fromParticipantId,
      toParticipantId: input.toParticipantId,
      amount: input.amount,
      currency,
      fxRate,
      amountBdt: money2(input.amount * fxRate),
      note: input.note ?? null,
    },
    include: SETTLEMENT_INCLUDE,
  });
  return serialize(s);
}

export async function deleteSettlement(tripId: string, id: string): Promise<{ deleted: boolean }> {
  const s = await db.tripSettlement.findUnique({ where: { id }, select: { tripId: true } });
  if (!s || s.tripId !== tripId) throw new Error("Settlement not found for this trip");
  await db.tripSettlement.delete({ where: { id } });
  return { deleted: true };
}
