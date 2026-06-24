// JSON-safe converters for Prisma Decimal and Date values. Every value returned
// by a solar service must be a plain JSON primitive.

export function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toNumOrNull(
  val: { toNumber(): number } | number | null | undefined
): number | null {
  if (val == null) return null;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toIso(val: Date | null | undefined): string | null {
  return val?.toISOString() ?? null;
}

/** Round to 3 decimals (kWh) for stable display/JSON. */
export function kwh(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Round to 2 decimals (currency). */
export function money(n: number): number {
  return Math.round(n * 100) / 100;
}
