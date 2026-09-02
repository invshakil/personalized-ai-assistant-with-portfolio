// Arithmetic for amount inputs: type "200 + 300 + 500", get 1000.
//
// Hand-written tokeniser and recursive-descent parser rather than `eval` or
// `new Function`. The input is a form field, so it is attacker-controlled by
// definition; there is no version of this that is safe to hand to an
// interpreter. Anything outside digits, `. + - * / ( )` and whitespace is
// rejected outright rather than sanitised, so there is no "clever" input to get
// past — the grammar below is the entire language.
//
// Grammar:
//   expr    := term (("+" | "-") term)*
//   term    := factor (("*" | "/") factor)*
//   factor  := ("-" | "+")? primary
//   primary := number | "(" expr ")"

/** Amounts are money, so results round to 2 decimals — 0.1 + 0.2 is 0.3, not 0.30000000000000004. */
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CalcResult {
  ok: boolean;
  /** The rounded result, or null when the input does not parse. */
  value: number | null;
}

const INVALID: CalcResult = { ok: false, value: null };

type Token = { kind: "num"; value: number } | { kind: "op"; value: string };

const OPERATORS = "+-*/()";

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (OPERATORS.includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      // "1.2.3" tokenises as one run but is not a number.
      if ((raw.match(/\./g)?.length ?? 0) > 1) return null;
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      tokens.push({ kind: "num", value });
      i = j;
      continue;
    }

    return null; // a character the grammar has no rule for
  }

  return tokens;
}

/**
 * Evaluate an arithmetic expression.
 *
 * Returns `ok: false` for anything that does not parse completely — an
 * unfinished expression ("200 +"), an unbalanced bracket, a stray character, or
 * a division by zero. Callers must treat that as "no amount yet" rather than
 * falling back to a partial read of the text: `parseFloat("200 + 300")` is 200,
 * which would silently save the wrong figure.
 */
export function evaluateExpression(input: string): CalcResult {
  const tokens = tokenize(input.trim());
  if (!tokens || tokens.length === 0) return INVALID;

  let pos = 0;
  let failed = false;

  const peek = (): Token | undefined => tokens[pos];
  const eatOp = (...ops: string[]): string | null => {
    const t = peek();
    if (t && t.kind === "op" && ops.includes(t.value)) {
      pos++;
      return t.value;
    }
    return null;
  };

  const parseExpr = (): number => {
    let left = parseTerm();
    for (;;) {
      const op = eatOp("+", "-");
      if (!op || failed) return left;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    for (;;) {
      const op = eatOp("*", "/");
      if (!op || failed) return left;
      const right = parseFactor();
      if (op === "/") {
        if (right === 0) {
          failed = true;
          return left;
        }
        left = left / right;
      } else {
        left = left * right;
      }
    }
  };

  const parseFactor = (): number => {
    const sign = eatOp("-", "+");
    const value = parsePrimary();
    return sign === "-" ? -value : value;
  };

  const parsePrimary = (): number => {
    const t = peek();
    if (!t) {
      failed = true;
      return 0;
    }
    if (t.kind === "num") {
      pos++;
      return t.value;
    }
    if (t.value === "(") {
      pos++;
      const inner = parseExpr();
      if (!eatOp(")")) failed = true;
      return inner;
    }
    failed = true;
    return 0;
  };

  const result = parseExpr();

  // Every token must be consumed: "2 3" and "2 + 3)" parse a valid prefix and
  // must still be rejected.
  if (failed || pos !== tokens.length || !Number.isFinite(result)) return INVALID;

  return { ok: true, value: round2(result) };
}

/**
 * True when the text is doing arithmetic rather than naming a single number.
 *
 * Used to decide whether to show the running total — "1000" needs no preview of
 * itself. A leading sign does not count as arithmetic.
 */
export function isExpression(input: string): boolean {
  return /[+\-*/()]/.test(input.trim().replace(/^[+-]/, ""));
}

/** The canonical form-state string for a result: no trailing zeros, no float noise. */
export function toAmountString(value: number): string {
  return String(round2(value));
}
