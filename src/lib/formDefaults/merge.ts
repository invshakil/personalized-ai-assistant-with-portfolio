// Merging stored defaults on the client.
//
// Pure and separate from the provider so it can be tested without React. The
// rule it encodes is easy to get subtly wrong: a "remember" write can *create* a
// row that the client has never seen, so a merge that only updates rows already
// in the map silently drops the first value of every lastUsed field — which is
// every lastUsed field, until the user reloads.
import type { FormDefaultRow } from "@/types";

const key = (r: { scope: string; field: string }) => `${r.scope}|${r.field}`;

/**
 * Apply the rows the server reports it wrote on top of the rows already held.
 *
 * `written` is authoritative: the server decides the effective mode and whether
 * a value is stored at all, so anything it returns replaces what is held, and
 * anything it omits leaves the held row untouched. Order is preserved for the
 * rows already present; newly created rows are appended.
 */
export function mergeRememberedRows(
  prev: readonly FormDefaultRow[],
  written: readonly FormDefaultRow[]
): FormDefaultRow[] {
  if (!written.length) return [...prev];

  const byKey = new Map(written.map((r) => [key(r), r]));
  const next = prev.map((r) => byKey.get(key(r)) ?? r);
  for (const r of prev) byKey.delete(key(r));
  return [...next, ...byKey.values()];
}
