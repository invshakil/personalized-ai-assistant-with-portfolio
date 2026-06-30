// Shared building blocks for the write-tool registry. The domain files
// (property.ts, finance.ts) import everything here; index.ts assembles them.
//
// Two-phase by design (see route + execute endpoint):
//   • preview(input) runs DURING the chat turn. It validates/looks up references
//     and returns a summary string. It must NEVER mutate data.
//   • commit(input)  runs ONLY after the user approves the action in the UI, via
//     POST /api/admin/ai/actions/execute. It re-parses the same untrusted input
//     and calls the real service (which enforces the actual rules).
//
// The model's input is untrusted: parse() coerces + validates and throws
// user-safe errors; the service layer is the real guard.
import type { AiToolDef, CommitResult } from "../types";

// ─── Tool definition shape ────────────────────────────────────────────────────

export interface WriteToolDef extends AiToolDef {
  kind: "write";
  /** Validate + describe without mutating. Returns a future-tense summary. */
  preview(input: Raw): Promise<string>;
  /** Re-validate + perform the write. Only called after user approval. */
  commit(input: Raw): Promise<CommitResult>;
}

export type Raw = Record<string, unknown>;

/**
 * Builds a write tool from a single `parse` shared by preview and commit, so the
 * approved input is validated identically on both passes.
 */
export function write<A>(def: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  parse: (input: Raw) => A;
  preview: (args: A) => Promise<string>;
  commit: (args: A) => Promise<CommitResult>;
}): WriteToolDef {
  return {
    name: def.name,
    description: def.description,
    parameters: def.parameters,
    kind: "write",
    preview: (input) => def.preview(def.parse(input)),
    commit: (input) => def.commit(def.parse(input)),
  };
}

// ─── Input coercion (model input is untrusted) ──────────────────────────────────

export const optStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

export const optNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

export const optBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

export function reqStr(v: unknown, field: string): string {
  const x = optStr(v);
  if (!x) throw new Error(`"${field}" is required.`);
  return x;
}

export function reqNum(v: unknown, field: string): number {
  const x = optNum(v);
  if (x === undefined) throw new Error(`"${field}" must be a number.`);
  return x;
}

export function reqDate(v: unknown, field: string): string {
  const x = optStr(v);
  if (!x || Number.isNaN(Date.parse(x)))
    throw new Error(`"${field}" must be a valid date (YYYY-MM-DD).`);
  return x;
}

export const optDate = (v: unknown, field: string): string | undefined =>
  optStr(v) === undefined ? undefined : reqDate(v, field);

export function reqEnum<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  const x = optStr(v);
  if (!x || !allowed.includes(x as T))
    throw new Error(`"${field}" must be one of: ${allowed.join(", ")}.`);
  return x as T;
}

export const optEnum = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  field: string
): T | undefined => (optStr(v) === undefined ? undefined : reqEnum(v, allowed, field));

export const optStrList = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => optStr(x)).filter((x): x is string => !!x) : undefined;

/** Require an update to actually change something. */
export function requireUpdate(obj: Record<string, unknown>): void {
  if (Object.values(obj).every((v) => v === undefined))
    throw new Error("Provide at least one field to update.");
}

// ─── Presentation helpers ───────────────────────────────────────────────────────

export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;

/** Supported transaction currencies (mirrors SUPPORTED_CURRENCIES / the money + finance services). */
export const CURRENCIES = ["BDT", "USD", "EUR"] as const;

const CUR_SYMBOL: Record<string, string> = { BDT: "৳", USD: "$", EUR: "€" };
/** Format an amount in its own currency (integer BDT, 2dp foreign) for previews/summaries. */
export const cur = (n: number, code: string) => {
  const sym = CUR_SYMBOL[code] ?? `${code} `;
  if (code === "BDT") return taka(n);
  return `${sym}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const ym = (m: number, y: number) => `${MONTHS[m] ?? m} ${y}`;

/** Safe field read from an unknown service result (no `any`). */
export function field(o: unknown, key: string): string | undefined {
  if (o && typeof o === "object" && key in o) {
    const v = (o as Record<string, unknown>)[key];
    return v == null ? undefined : String(v);
  }
  return undefined;
}

export const nameOf = (o: unknown) => field(o, "name");

// ─── Parameter-schema shorthands ─────────────────────────────────────────────────

export const schema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
});
export const Str = (description: string) => ({ type: "string", description });
export const Num = (description: string) => ({ type: "number", description });
export const Bool = (description: string) => ({ type: "boolean", description });
export const Int = (description: string) => ({ type: "integer", description });
export const Enum = (vals: readonly string[], description: string) => ({
  type: "string",
  enum: [...vals],
  description,
});

// ─── Enum value lists (mirror the Prisma enums the services accept) ──────────────

export const EXPENSE_CATEGORIES = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
] as const;
export const TX_TYPES = [
  "CASH",
  "BANK_TRANSFER",
  "ADVANCE_APPLIED",
  "ADJUSTMENT",
  "OTHER",
] as const;
export const REMITTANCE = ["REM", "NON_REM"] as const;
export const PAYMENT_KINDS = ["SALARY", "BONUS", "ADVANCE", "OTHER"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL", "OVERDUE"] as const;
