// The Ledger's URL query → getEntries options. Shared by the list route and the
// export route so an exported file always matches the list it was exported from.
import { MoneyEntryDirection } from "@prisma/client";
import { isoDayParam, listParam, searchParam } from "@/services/_shared/listQuery";
import type { EntrySortBy, EntrySortDir, GetEntriesOpts } from "./entries";

const SORT_BY: EntrySortBy[] = ["date", "amount", "category"];
const SORT_DIR: EntrySortDir[] = ["asc", "desc"];
const MAX_LIMIT = 5000;

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export function parseEntryQuery(sp: URLSearchParams): GetEntriesOpts {
  const limit = Number(sp.get("limit"));
  return {
    period: sp.get("period") ?? undefined,
    from: isoDayParam(sp.get("from")),
    to: isoDayParam(sp.get("to")),
    categoryIds: listParam(sp.get("categoryIds")),
    accountIds: listParam(sp.get("accountIds")),
    beneficiaryId: sp.get("beneficiaryId")?.trim() || undefined,
    currencies: listParam(sp.get("currencies"), 50)?.map((c) => c.toUpperCase()),
    q: searchParam(sp.get("q")),
    direction: oneOf(sp.get("direction"), Object.values(MoneyEntryDirection)),
    sortBy: oneOf(sp.get("sortBy"), SORT_BY),
    sortDir: oneOf(sp.get("sortDir"), SORT_DIR),
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : undefined,
  };
}
