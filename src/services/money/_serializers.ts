// JSON-safe converters for Prisma Decimal and Date values.
// Every value returned by a money service must be a plain JSON primitive.

export function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toIso(val: Date | null | undefined): string | null {
  return val?.toISOString() ?? null;
}
