// Realized-basis income — the single seam for "when does a foreign earning count
// as BDT income." A foreign earning is PENDING (realizedAt NULL) and excluded from
// the P&L until converted; on conversion it carries the ACTUAL BDT received
// (realizedAmount) at the real rate, booked in the conversion period (realizedAt).
// BDT earnings are realized-on-earn (realizedAt = date, realizedAmount = amount),
// so this rule reproduces the historical numbers exactly for the 212 BDT rows.
//
// Every income aggregation in dashboard.ts / reports.ts MUST go through here so a
// future report can't reintroduce double-counting by summing the indicative
// `Earning.amount` of an unconverted foreign row.
import { db } from "@/lib/db";
import { fiscalYearOf } from "@/lib/fiscalYear";
import type { RemittanceType } from "@prisma/client";
import type { ResolvedRange } from "@/services/_shared/dateRange";
import { toNum } from "./_serializers";

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Prisma `where` selecting realized earnings within a range applied to realizedAt. */
export function realizedRangeWhere(r: ResolvedRange) {
  return {
    realizedAt: {
      not: null,
      ...(r.from && { gte: r.from }),
      ...(r.to && { lte: r.to }),
    },
  };
}

export interface RealizedEarning {
  realizedAt: Date;
  realizedAmount: number; // BDT booked
  sourceId: string;
  remittance: RemittanceType;
  fiscalYear: string; // fiscalYearOf(realizedAt) — NOT the stored earn-date FY
  period: string; // YYYY-MM of realizedAt
}

/**
 * Realized earnings (realizedAt not null) for the given range. The range is
 * applied to realizedAt, and fiscalYear/period are derived from realizedAt so
 * income is attributed to the CONVERSION period.
 */
export async function getRealizedEarnings(range: ResolvedRange): Promise<RealizedEarning[]> {
  const rows = await db.earning.findMany({
    where: realizedRangeWhere(range),
    select: {
      realizedAt: true,
      realizedAmount: true,
      amount: true,
      sourceId: true,
      remittance: true,
    },
  });
  return rows.map((r) => {
    const at = r.realizedAt as Date;
    return {
      realizedAt: at,
      // Defensive: realizedAmount is set whenever realizedAt is, but fall back to amount.
      realizedAmount: r.realizedAmount == null ? toNum(r.amount) : toNum(r.realizedAmount),
      sourceId: r.sourceId,
      remittance: r.remittance,
      fiscalYear: fiscalYearOf(at),
      period: monthKey(at),
    };
  });
}
