# Security & Code Audit — Trip Expense Manager + Dynamic Currency

**Date:** 2026-07-26
**Scope:** the newly added Trip Expense Manager feature and the dynamic-currency change — `src/services/trips/**`, `src/app/api/admin/trips/**`, `src/app/api/admin/currencies/route.ts`, `src/app/(portfolio)/trips/[slug]/page.tsx`, `src/services/_shared/fx.ts`, the `tripId`/`tripCategory` additions in `src/services/money/entries.ts`, and the currency-picker swaps. (`src/app/api/admin/property/payments/pdf/route.tsx` was a pre-existing unrelated change — out of scope.)
**Method:** manual review + an independent adversarial security pass (separate agent) that empirically verified the runtime behaviours cited below (`Prisma.Decimal` accepts `NaN`/`Infinity`; `JSON` `1e999`→`Infinity`; `Number(undefined)`→`NaN`; `'toString' in <enum>`→`true`).

## Clean (verified, no action)

- **Auth** — every one of the 8 trip route files and `currencies/route.ts` gates each handler with `const session = await auth(); if (!session) return 401`. No missing check.
- **Public data leak** — `getPublicTripSummary` returns only aggregate-safe fields (name, destination, currencies, dates, duration, `publicIntro`, totals, per-category, per-day). No account names/ids, balances, private `notes`, or other trips. Query is gated `{ publicSlug, isPublic: true }`.
- **SSRF / SQL injection** — no raw SQL (all Prisma); the FX host is fixed and the currency code is both regex-gated (`^[A-Z]{3}$`) and `encodeURIComponent`-wrapped before hitting the feed.
- **XSS** — `publicIntro`/`name`/`destination` render as React text nodes; no `dangerouslySetInnerHTML`.

## Findings

| #   | Sev      | Area             | Summary                                                                                                                        | Status   |
| --- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **HIGH** | Input validation | `NaN`/`Infinity` amounts bypass `<= 0` guards → poison derived balances app-wide                                               | ✅ Fixed |
| 2   | MED      | Data integrity   | Trip wallet account currency not required to match `localCurrency` → wrong wallet math                                         | ✅ Fixed |
| 3   | MED      | Input validation | `localCurrency`/`homeCurrency` accept arbitrary strings → silent 0-value reports                                               | ✅ Fixed |
| 4   | LOW      | Input validation | Enum guard `body.category in TripCategory` matches prototype keys (`"toString"`)                                               | ✅ Fixed |
| 5   | LOW      | Consistency      | Trip-expense edit/delete not scoped to the trip in the URL (any ledger row reachable)                                          | ✅ Fixed |
| 6   | LOW      | Robustness       | Malformed dates reach Prisma as `Invalid Date` (verbose 400 instead of clean one)                                              | ✅ Fixed |
| 7   | OPT      | Performance      | `getTrips()` runs a per-trip query (N+1) for actuals                                                                           | ✅ Fixed |
| 8   | OPT      | Performance      | Budget save issues 8 sequential PUTs (one per category) even when unchanged                                                    | ✅ Fixed |
| —   | INFO     | —                | Public slug `name-<last6 of cuid>`: only published trips resolve and their content is intended-public — not a vuln. No change. | n/a      |

### 1. HIGH — `NaN`/`Infinity` bypass the amount guards and poison the ledger

The guards `input.amount <= 0` / `plannedAmount < 0` are not satisfied by `NaN` or `Infinity`
(`NaN <= 0` → false, `NaN == null` → false), so a request with `amount` omitted (`Number(undefined)`
→ `NaN`) or `amount: 1e999` (valid JSON → `Infinity`) slips through `createEntry`
([entries.ts](../../src/services/money/entries.ts)), `recordTransfer`, and `setTripBudget`
([trips.ts](../../src/services/trips/trips.ts)). `Prisma.Decimal` and Postgres `numeric` both accept
`NaN`/`Infinity`, so the row is written. Because account balances, savings, and trip totals are all
**derived by summing `amount`**, a single poisoned DEBIT turns balances, the savings figure, and every
trip total into `NaN`/`Infinity` across the whole Money module.

**Fix:** replaced the sign-only guards with finiteness+sign checks (`!Number.isFinite(x) || x <= 0`)
in `createEntry`, `updateEntry`, `recordTransfer` (shared services — protects the entire money module),
and `setTripBudget`. Routes reject non-finite input up front for a clean 400.

### 2. MED — wallet account currency not validated against `localCurrency`

`computeWallet` reads the wallet's native balance but values it with the trip's `localCurrency` rate.
Nothing required the wallet account's currency to equal `localCurrency`, so picking (via the API) a USD
account for an MYR trip produced nonsense `balanceBdt`/`fundedLocal`.
**Fix:** `createTrip`/`updateTrip` now load the chosen account and reject a currency mismatch.

### 3. MED — trip currencies unvalidated

`(input.localCurrency || "BDT").toUpperCase()` accepted `"HELLO"`, `"12"`, etc.; downstream
`getFxRateToBdt` then returns rate 0 and the trip silently reports 0 local cost.
**Fix:** `createTrip`/`updateTrip` validate `localCurrency`/`homeCurrency` are well-formed ISO codes.

### 4. LOW — enum guard matches prototype keys

`body.category in TripCategory` is true for `"toString"`/`"valueOf"`. Prisma rejects the bogus value so
no bad row is written, but the guard was ineffective.
**Fix:** use `Object.prototype.hasOwnProperty.call(TripCategory, body.category)` in the budgets and
expenses routes.

### 5. LOW — expense mutations not scoped to the trip

`PUT/DELETE /trips/<id>/expenses/<entryId>` ignored `<id>`, so any `MoneyEntry` id was reachable
through any trip (a non-trip ledger row could be deleted via a trip endpoint). Single-admin app, so no
cross-user IDOR, but a correctness/consistency gap.
**Fix:** `updateTripExpense`/`deleteTripExpense` now require the entry to belong to that trip and be a
DEBIT.

### 6. LOW — malformed dates

`new Date("garbage")` → `Invalid Date` reaches Prisma and 400s with a verbose message.
**Fix:** explicit `Invalid Date` checks in `createTrip`, `createTripExpense`, `fundTripWallet`.

### 7 & 8. Optimizations

- `getTrips()` looped a `findMany` per trip. **Fixed:** one query over all trip-tagged DEBITs, bucketed
  in memory.
- The budget editor PUT all 8 categories sequentially each save. **Fixed:** the hook only sends
  categories whose value actually changed.

## Verification

`npx tsc --noEmit` · `eslint` · `next build` · trips integration test (extended with NaN-rejection and
trip-scoping cases) · money scenario tests — all green after the fixes.
