import { db } from "@/lib/db";
import { RemittanceType } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { toNum, toIso } from "./_serializers";

export async function getEarnings(opts: { fiscalYear?: string; sourceId?: string } = {}) {
  const earnings = await db.earning.findMany({
    where: {
      ...(opts.fiscalYear && { fiscalYear: opts.fiscalYear }),
      ...(opts.sourceId && { sourceId: opts.sourceId }),
    },
    orderBy: [{ date: "desc" }],
    include: { source: { select: { name: true } } },
  });
  return earnings.map((e) => ({
    id: e.id,
    date: toIso(e.date),
    sourceId: e.sourceId,
    sourceName: e.source.name,
    remittance: e.remittance,
    amount: toNum(e.amount),
    fiscalYear: e.fiscalYear,
    notes: e.notes,
  }));
}

export interface CreateEarningInput {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function createEarning(input: CreateEarningInput) {
  const date = new Date(input.date);
  const earning = await db.earning.create({
    data: {
      date,
      sourceId: input.sourceId,
      remittance: input.remittance,
      amount: input.amount,
      fiscalYear: input.fiscalYear || fiscalYearOf(date),
      notes: input.notes ?? null,
    },
  });
  return { ...earning, amount: toNum(earning.amount), date: toIso(earning.date) };
}

export interface UpdateEarningInput {
  date?: string;
  sourceId?: string;
  remittance?: RemittanceType;
  amount?: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateEarning(id: string, input: UpdateEarningInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;
  const earning = await db.earning.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.sourceId && { sourceId: input.sourceId }),
      ...(input.remittance && { remittance: input.remittance }),
      ...(input.amount != null && { amount: input.amount }),
      // Recompute fiscal year from the new date unless one is explicitly given.
      ...(input.fiscalYear
        ? { fiscalYear: input.fiscalYear }
        : nextDate
          ? { fiscalYear: fiscalYearOf(nextDate) }
          : {}),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...earning, amount: toNum(earning.amount), date: toIso(earning.date) };
}

export async function deleteEarning(id: string) {
  await db.earning.delete({ where: { id } });
  return { deleted: true };
}
