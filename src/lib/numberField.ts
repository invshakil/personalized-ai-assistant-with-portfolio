// The behaviour behind the shared <NumberField>, kept free of React so it can
// be unit-tested without a DOM. The component is a thin shell over these
// functions: whatever it decides, it decides here.
//
// Every numeric input in the admin is a calculator — "200 + 300 + 500" settles
// on 1000 — so the rules below are the contract for all of them, not just
// amounts. See calcExpression.ts for the arithmetic itself.
//
// The one rule that matters most: **the parent only ever receives a resolved
// number as a string, or "".** Mid-expression the parent gets "" rather than a
// partial read, because parseFloat("200 + 300") is 200 — a form saved at that
// moment would store the wrong figure with nothing to show for it. The same
// goes for a value that breaks the field's rules (a fraction in a whole-number
// field, a value under its minimum): an empty number fails loudly on save, a
// plausible wrong one does not.
import {
  DEFAULT_DECIMALS,
  evaluateExpression,
  isExpression,
  toAmountString,
} from "./calcExpression";

export interface NumberRules {
  /** Reject fractions — for counts, days, minutes, percentages of whole units. */
  integer?: boolean;
  min?: number;
  max?: number;
  /** Rounding precision for the result. Defaults to 2 (money). */
  decimals?: number;
}

export type Resolution =
  | { kind: "empty" }
  | { kind: "ok"; value: number; text: string }
  | { kind: "invalid"; reason: string };

/** Characters the grammar accepts; anything else is dropped as it is typed. */
const DISALLOWED = /[^0-9+\-*/(). ]/g;

/** Strip everything the calculator grammar cannot use (letters, commas, "e"). */
export const sanitizeNumberInput = (raw: string): string => raw.replace(DISALLOWED, "");

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

/** Evaluate the text and check it against the field's rules. */
export function resolveNumberInput(text: string, rules: NumberRules = {}): Resolution {
  if (text.trim() === "") return { kind: "empty" };

  const decimals = rules.integer ? 0 : (rules.decimals ?? DEFAULT_DECIMALS);
  // Evaluate at full precision first so "10 / 4" in a whole-number field is
  // caught as 2.5 rather than silently rounded to 3.
  const raw = evaluateExpression(text, rules.integer ? 6 : decimals);
  if (!raw.ok || raw.value === null) return { kind: "invalid", reason: "Not a valid number" };

  if (rules.integer && !Number.isInteger(raw.value)) {
    return { kind: "invalid", reason: "Must be a whole number" };
  }
  if (rules.min != null && raw.value < rules.min) {
    return { kind: "invalid", reason: `Must be at least ${fmt(rules.min)}` };
  }
  if (rules.max != null && raw.value > rules.max) {
    return { kind: "invalid", reason: `Must be at most ${fmt(rules.max)}` };
  }
  return { kind: "ok", value: raw.value, text: toAmountString(raw.value, decimals) };
}

/** What the parent receives for a given draft: a clean number string, or "". */
export const emittedValue = (text: string, rules: NumberRules = {}): string => {
  const r = resolveNumberInput(text, rules);
  return r.kind === "ok" ? r.text : "";
};

export interface SettleOutcome {
  /** null drops the draft so the parent's canonical value shows again. */
  draft: string | null;
  /** Set when the text is kept for correction, with the reason to show. */
  error: string | null;
}

/**
 * Leaving the field (blur or Enter). A valid or empty draft is dropped in
 * favour of the resolved value; an invalid one is kept — with its reason — so it
 * can be corrected rather than retyped.
 */
export function settleDraft(draft: string, rules: NumberRules = {}): SettleOutcome {
  const r = resolveNumberInput(draft, rules);
  if (r.kind === "invalid") return { draft, error: r.reason };
  return { draft: null, error: null };
}

export interface FieldStatus {
  error: boolean;
  /** The line to show, or null to fall back to the parent's own helper text. */
  text: string | null;
}

/**
 * The helper line under the field. While typing, an incomplete expression
 * ("200 +") is normal and says nothing — errors only surface once the field has
 * been left. A running total shows while the text is doing arithmetic; a plain
 * "1000" needs no preview of itself.
 */
export function fieldStatus(
  draft: string | null,
  settleError: string | null,
  rules: NumberRules = {}
): FieldStatus {
  if (settleError) return { error: true, text: settleError };
  if (draft !== null && isExpression(draft)) {
    const r = resolveNumberInput(draft, rules);
    if (r.kind === "ok") return { error: false, text: `= ${fmt(r.value)}` };
  }
  return { error: false, text: null };
}

/** The parent's value as display text — accepts numbers, since some forms hold them. */
export const toDisplay = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);
