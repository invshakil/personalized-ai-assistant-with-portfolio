// JSON-safe converters for Prisma Decimal and Date values in the Trips domain.
// Every value returned by a trips service must be a plain JSON primitive.

export function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toIso(val: Date | null | undefined): string | null {
  return val?.toISOString() ?? null;
}

/** Per-row BDT rate (null/legacy → 1) — canonicalizes a foreign entry to BDT. */
export function rowRate(fxRate: { toNumber(): number } | number | null): number {
  return fxRate == null ? 1 : toNum(fxRate);
}

/** Round to 2 dp (money). */
export function money2(n: number): number {
  return Math.round(n * 100) / 100;
}
