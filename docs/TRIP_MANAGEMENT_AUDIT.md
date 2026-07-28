# Trip Management — Security, Optimization & Code-Standard Audit

**Scope:** the Trip Expense Manager feature end-to-end
**Reviewed:** 2026-07-27
**Branch:** `claude/trip-management-audit-review-0xi01t`

## Files in scope

| Layer          | Files                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Schema         | `prisma/schema.prisma` (Trip, TripBudget, TripParticipant, TripExpense, TripExpenseShare, TripSettlement)           |
| Services       | `src/services/trips/*` (trips, participants, expenses, settlements, fund, report, public, `_split`, `_serializers`) |
| API routes     | `src/app/api/admin/trips/**` (13 handlers)                                                                          |
| Public surface | `src/app/(portfolio)/trips/[slug]/page.tsx`, `src/services/trips/public.ts`                                         |
| Client / AI    | `src/lib/api/trips.ts`, `src/services/ai/tools.ts` (trip read tools)                                                |
| Admin UI       | `src/app/(admin)/admin/trips/**` (orchestrators, hooks, components)                                                 |
| Tests          | `src/services/trips/__tests__/trips.scenarios.test.ts`                                                              |

---

## Verdict

The feature is **well-architected and in good shape.** Auth is enforced consistently, the public surface is carefully whitelisted, the split/settlement math is exact and well-tested, and the code fully conforms to the repo's decomposition and layering conventions. **No High or Critical issues were found.** The findings below are a small number of Medium/Low hardening opportunities.

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 0     |
| Medium   | 3     |
| Low      | 5     |
| Info     | 3     |

---

## 1. Security

### Strengths ✅

- **Every admin route checks the session first.** All 13 handlers call `const session = await auth(); if (!session) return 401` before any work — matching the `CLAUDE.md` API contract exactly.
- **Public summary is a strict whitelist.** `getPublicTripSummary()` returns only aggregate, non-identifying fields (destination, dates, per-category/day BDT+local totals, intro). It never selects participant names, account names, notes, or per-person spend, and it filters on `isPublic: true`. A dedicated test (`publish exposes an aggregate-safe summary`) asserts that participant and account names do not appear in the serialized output.
- **Cross-resource scoping is enforced in the service layer, not just by route shape.** `loadExpense`, `deleteSettlement`, `updateParticipant`, and `deleteParticipant` all re-verify `row.tripId === tripId` before mutating, and `resolveExpense`/`createSettlement` verify every payer/share/settlement participant belongs to the trip. This is defense-in-depth beyond the URL. (Single-admin app, so classic IDOR is out of scope, but this scoping still prevents cross-trip data corruption from a malformed request.)
- **React auto-escaping on the public page** — `publicIntro` is rendered as text (`whitespace-pre-line`), not `dangerouslySetInnerHTML`, so stored-content XSS is not possible.
- **Currency codes are validated** against a supported list (`isSupportedCurrency`) before persistence.

### MEDIUM — Unauthenticated public page can trigger an external FX call + DB write

**Where:** `src/app/(portfolio)/trips/[slug]/page.tsx` → `getPublicTripSummary` → `getFxRateToBdt(trip.localCurrency)`

The public page has no caching directive (no `revalidate` / `dynamic`), so it is rendered dynamically on every request. `getFxRateToBdt` serves from a DB cache when fresh, **but on a cache miss it performs an outbound `fetch` to `open.er-api.com` and writes an `FxRate` row** — both driven by an anonymous visitor. A published trip whose local-currency rate has gone stale becomes an amplification vector: each hit fans out to a third-party API and a DB upsert, and site availability now partly depends on that feed.

**Recommendation:** add ISR to the public page (`export const revalidate = 3600`) so anonymous traffic is served from the rendered cache, and/or have the public path read the last cached rate only (never fetch-live for unauthenticated callers).

### LOW — Soft-delete is enforced only in the UI, not server-side

**Where:** `resolveExpense` / `createSettlement` (`expenses.ts`, `settlements.ts`)

Participants with split history are soft-deleted (`isActive = false`) to preserve who-owes-whom integrity. The admin UI correctly filters them out (`useTripExpenseDrawer.ts:29`, `TripDetailPage.tsx:37`), **but the service only checks trip membership, not `isActive`.** A crafted API request can still name a soft-deleted participant as a payer, share, or settlement party — partially defeating the soft-delete guarantee.

**Recommendation:** in the participant-membership checks, also require `isActive: true` for newly added payers/shares/settlement parties (while still allowing historical rows to render).

### LOW — No length caps on free-text fields

**Where:** `name`, `destination`, `notes`, `publicIntro`, expense `description`, participant/settlement `note`

These are unbounded `String`s with no server-side max-length. Not an injection risk (Prisma parameterizes; React escapes), but it allows oversized payloads to be stored and, for `publicIntro`, rendered publicly.

**Recommendation:** add reasonable `maxLength` guards (e.g. 200 for names, 5–10k for intros) in the services.

### INFO — `fxRate` is client-supplied and trusted

`input.fxRate` (when `> 0`) is used verbatim as the BDT conversion rate. Acceptable for a single-admin tool, but worth documenting as a trust assumption — a mistaken/overridden rate silently changes reported BDT totals.

---

## 2. Correctness

### Strengths ✅

- **Split math is exact.** `distributeByWeights` uses largest-remainder-of-cents so both the currency parts and the BDT parts sum _exactly_ to their totals — no rounding drift. Duplicate participants and EXACT-sum mismatches are rejected. Tested with an odd amount (`3001/3`).
- **Who-owes-whom is correct.** `minimalTransfers` runs a greedy integer-cent match; the test suite applies the suggested transfers back and asserts every balance zeroes out.
- **Ledger reconciliation is transactional.** Expense create/update/delete wrap the linked `MoneyEntry` and the share rows in `db.$transaction`, and the update path correctly creates/updates/deletes the ledger entry as the posting rule changes.
- **Posting rule is well-isolated and tested** — self + real spendable account posts a DEBIT; credit-card and friend-paid do not. Deletes/edits keep the personal ledger consistent.
- **Trip deletion preserves the money ledger** (`MoneyEntry.tripId → SetNull`), while budgets/participants/expenses/shares/settlements cascade — matches the documented "a trip is a tag" model.

### MEDIUM — `endDate` before `startDate` is never rejected

**Where:** `createTrip` / `updateTrip` (`trips.ts`) validate each date individually but never compare them.

An `endDate < startDate` flows straight through and produces a **negative `durationDays`** and a **negative per-day average** on the public cost-guide page (`public.ts:48`, `page.tsx:49`).

**Recommendation:** after parsing, `if (endDate && endDate < startDate) throw new Error("endDate must be on or after startDate")`.

### MEDIUM — Wallet funding silently valued at 0 when a rate is missing

**Where:** `computeWallet` (`report.ts:46`)

```ts
fundedBdt += f.currency === "BDT" ? amt : amt * (rates.get(f.currency)?.rate ?? 0);
```

If the source currency has no cached/live rate, the `?? 0` values that funding at **zero BDT**, silently understating `fundedBdt` in the wallet summary rather than surfacing an unknown. Note the funding TRANSFER already stored a per-row `fxRate` — that is the correct fallback here.

**Recommendation:** fall back to the entry's stored `fxRate` (canonical for that transaction) instead of `0`, or mark the summary as incomplete when a rate can't be resolved.

### LOW — No lifecycle guard on `CLOSED` trips

Expenses and settlements can still be created against a trip in `CLOSED` status. This may be intentional (late corrections), but there is no explicit decision recorded. Flag for confirmation; if closing should freeze the ledger, guard it in the service.

---

## 3. Performance / Optimization

### Strengths ✅

- **`getTrips` avoids N+1** — a single `tripExpense.findMany` for all trips, bucketed in memory (explicitly commented). All FK columns are indexed; `publicSlug` is `@unique`.
- **`getTripReport` batches** its three reads with `Promise.all`.

### LOW — `getTrips` loads all expense rows to sum them

The in-memory bucketing pulls every `{tripId, amountBdt}` row across all trips. A `db.tripExpense.groupBy({ by: ['tripId'], _sum: { amountBdt: true }, _count: true })` returns the same totals without transferring per-row data — leaner as expense volume grows.

### LOW — Redundant aggregate in the report path

`getTripReport` calls `getTrip(tripId)` (which runs `actualsFor` — a full `tripExpense.aggregate`) and then independently re-queries and re-sums all expenses for the same trip. The group total is computed twice. Minor; could reuse the report's own `groupTotalBdt`.

### LOW — Public page has no ISR (see MEDIUM security finding)

Adding `export const revalidate = <seconds>` addresses both the FX-amplification concern and the per-request DB cost.

---

## 4. Code Standards & Architecture

**Fully compliant** with `AGENTS.md` / `CODING_CONVENTION.md`:

- ✅ **Decomposition limits respected.** Largest orchestrator `TripDetailPage.tsx` = 245 lines (< 300); largest hook `useTripExpenseDrawer.ts` = 178 (< 200); all components under their limits.
- ✅ **Layering clean.** Routes are thin and delegate to `src/services/trips/`. No `fetch()`, `useState` business state, `useEffect`, or Redux selectors in any `components/` file. Client code uses the typed `tripsApi`, never inline `fetch`.
- ✅ **No `any`, no `@ts-ignore`, no default exports from lib, no Tailwind in admin, no MUI in portfolio.**
- ✅ **`{ data, error }` envelope** used consistently across all routes.
- ✅ **AI tools kept in lockstep** — `list_trips`, `get_trip_report`, `list_trip_participants` are exposed as read tools with accurate descriptions; write tools are deliberately omitted.
- ✅ **Serialization discipline** — every service returns JSON-safe primitives via `_serializers` (Decimal→number, Date→ISO).

### LOW — `updateTrip` forwards the raw request body

**Where:** `src/app/api/admin/trips/[id]/route.ts:22` — `await updateTrip(id, body)`.

Unlike the POST handler (which maps each field explicitly), the PUT handler passes the untrusted `body` straight into the service. It is **safe in practice** because `updateTrip` spreads fields one-by-one into the Prisma `data` object (no mass-assignment), but it is inconsistent with the create path and the repo's "never trust the request body directly" guidance.

**Recommendation:** map the accepted fields explicitly in the route, mirroring POST.

### INFO — `parseExpenseBody` stringifies possibly-absent ids

`participantId: String(s.participantId)` yields the literal `"undefined"` when absent, relying on the downstream membership `count` check to reject it. Works, but an explicit presence check would fail faster with a clearer message.

### INFO — Test coverage is strong

`trips.scenarios.test.ts` covers the posting rule (cash/card/friend), exact-cent splitting, cross-currency wallet funding, EXACT-sum validation, non-finite rejection, cross-trip scoping, settlement netting, who-owes-whom zeroing, and the public aggregate-safety guarantee. Gaps worth adding: `endDate < startDate` rejection, soft-deleted-participant reuse, and the missing-FX-rate wallet valuation.

---

## Prioritized action list

| #   | Severity | Finding                                                       | Fix location                         |
| --- | -------- | ------------------------------------------------------------- | ------------------------------------ |
| 1   | Medium   | Public page → anonymous external FX fetch + DB write; add ISR | `trips/[slug]/page.tsx`, `public.ts` |
| 2   | Medium   | `endDate < startDate` accepted → negative duration/per-day    | `trips.ts` create/update             |
| 3   | Medium   | Wallet funding valued at 0 BDT on missing rate                | `report.ts:46`                       |
| 4   | Low      | Soft-deleted participants reusable via API                    | `expenses.ts`, `settlements.ts`      |
| 5   | Low      | No max-length on free-text fields                             | services                             |
| 6   | Low      | `getTrips` full-row scan vs `groupBy`                         | `trips.ts` `getTrips`                |
| 7   | Low      | `updateTrip` forwards raw body                                | `trips/[id]/route.ts`                |
| 8   | Low      | No `CLOSED`-status guard (confirm intent)                     | `expenses.ts`, `settlements.ts`      |

None of these block release; items 1–3 are the highest-value hardening steps.

---

## Resolution (applied on this branch)

Items **1–7 are fixed**; **8 is deferred** pending a product decision.

- **#1** — `export const revalidate = 3600` on the public trip page; anonymous traffic is served from the ISR cache (one FX/DB refresh per window, not per visit).
- **#2** — `createTrip`/`updateTrip` reject `endDate < startDate`, comparing against the effective (new-or-existing) dates on update.
- **#3** — `computeWallet` values each funding by its **stored per-row `fxRate`** (canonical), falling back to a live rate only for legacy rows that never stored one — never silently to `0`.
- **#4** — expense payer/shares and settlement parties must be `isActive` at the service layer, not just filtered in the UI.
- **#5** — length caps on trip name/destination/notes/publicIntro, expense description, participant name/note, and settlement note.
- **#6** — `getTrips` uses `groupBy` (`_sum` + `_count`) instead of transferring every expense row.
- **#7** — `PUT /trips/[id]` maps accepted fields explicitly instead of forwarding the raw body.
- **#8** — left as-is: whether a `CLOSED` trip should freeze its ledger or still allow late corrections is a product decision.

Added regression tests in `trips.scenarios.test.ts`: `endDate before startDate is rejected` and `a soft-deleted participant cannot be added to new splits`. Verified with `tsc --noEmit` (0 errors) and `eslint` (clean); the integration suite requires a dev DB (`DATABASE_URL`) not available in the review environment.
