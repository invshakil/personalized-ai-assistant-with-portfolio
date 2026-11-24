// The Earnings page's URL query → getEarnings options. Shared by the list route
// and the export routes so an exported file always matches the list on screen.
import { isoDayParam, listParam, searchParam } from "@/services/_shared/listQuery";
import type { GetEarningsOptions } from "./earnings";

export function parseEarningQuery(sp: URLSearchParams): GetEarningsOptions {
  const remittance = sp.get("remittance");
  return {
    // The old PDF link passed a single `fiscalYear` / `sourceId`; both spellings work.
    fiscalYears: listParam(sp.get("fiscalYears") ?? sp.get("fiscalYear"), 50),
    sourceIds: listParam(sp.get("sourceIds") ?? sp.get("sourceId")),
    remittance: remittance === "REM" || remittance === "NON_REM" ? remittance : undefined,
    period: sp.get("period") ?? undefined,
    from: isoDayParam(sp.get("from")),
    to: isoDayParam(sp.get("to")),
    q: searchParam(sp.get("q")),
  };
}
