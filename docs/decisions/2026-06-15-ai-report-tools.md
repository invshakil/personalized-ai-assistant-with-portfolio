# AI report tools for finance and property

**About 19 pre-aggregated, read-only report tools were added for the assistant, with date ranges resolved on the server** (Shakil, 15 Jun 2026).

`services/finance/reports.ts`:

- Monthly profit and loss, client profitability, employee cost, expense breakdown, subscription run-rate, remittance, fiscal-year comparison.

`services/property/reports.ts`:

- Multi-month financials, expense breakdown, payee spend, collection by method, service revenue, rent roll, arrears, advance liability, occupancy, lease expiry, scheduled rent changes, tenant statement.

Plus a cross-domain combined-income summary composed in the tool handler.

A new shared `services/_shared/dateRange.ts` resolves relative `period` tokens (`last_3_months`, `this_year`, `this_fiscal_year` and so on) or explicit `from` and `to`. It runs on the server, and the model is told today's date so it picks the right token.

All of them were wired into `services/ai/tools.ts`, 31 read tools in total at that point, and documented in `AI_TOOLS_REFERENCE.md` section 3.

Verified: `tsc`, eslint and build clean. All reports were run against the real database: fiscal-year resolution, property month and year range filtering, arrears maths, the running-balance statement, and the cross-domain composition.
