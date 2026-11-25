# Ledger and Earnings export, and exact balances (#17)

**The Ledger and the Earnings page export exactly the filtered, sorted list on screen as CSV or PDF, and the Accounts page shows every amount to 2 decimals** (Shakil, 25 Nov 2026).

- **Why:** the list page was the only way to get the numbers out, and the Accounts page rounded away the fraction, so a balance could look right and be off.

How it works:

- **The file always matches the table.** The list route and the export route share one query parser (`entryQuery.ts`). Row and totals builders are pure (`src/services/money/ledgerExport.ts`), with income, expense and net totals per currency.
- **CSV cells are protected against formula injection** (`src/services/_shared/csv.ts`), with header-safe file names and `no-store`.
- **A PDF is capped at 1,000 rows;** CSV has no cap. Export routes refuse cross-site requests (`Sec-Fetch-Site`), so another site can't make the server render PDFs.
- **Earnings** gained a Remittance / Non-remittance filter, kept in the URL, beside the client filter.
- **Exact balances:** `fmtCurrencyExact` on the Accounts page, including BDT. Compact lists elsewhere still round BDT (`fmtCurrency`).

Shared pieces: `listQuery.ts` for validated URL parameters, the `ExportMenuButton` admin component, and `downloadUrl()` in `src/lib/api/client.ts`.

Commit `5afa813`.
