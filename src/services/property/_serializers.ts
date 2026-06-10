// Shared helpers for converting Prisma Decimal and Date values to plain JSON types.
// All values returned by service functions must be JSON-safe primitives.

export function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toIso(val: Date | null | undefined): string | null {
  return val?.toISOString() ?? null;
}
