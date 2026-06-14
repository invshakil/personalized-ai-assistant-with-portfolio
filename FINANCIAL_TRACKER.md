# FINANCIAL_TRACKER.md — Business Financial Tracker module

**Owner:** Syful Islam Shakil
**Module route:** `/admin/finance` (replaces the current StubPage)
**Source data:** `Financial Tracker.xlsx` (Google Sheet export, 6 sheets)
**Created:** 2026-06-13
**Status:** ✅ Phases 1–6 + enhancement round 2 (Phases 8–12) complete. Live at `/admin/finance`:
dashboard (with **date-range filter**), earnings, salaries, expenses, **subscriptions** (start/stop +
per-month history), settings. **Per-row PDF receipts** + **report PDF**, themed **delete confirmations**,
and **current-fiscal-year defaults** throughout. Salary payments link to **one unified client list**
(multi-select) with an optional note. Build + lint + typecheck pass; HTTP smoke tests pass.
Phase 7 (optional AI assistant tools) remains.

> Living source-of-truth for the Financial Tracker feature. Claude Code and Syful both update the
> **Progress tracker** as phases land. This is distinct from the **property/rental** finance —
> it tracks the **software business/agency**: client income, employee salaries, tool subscriptions,
> and fiscal-year P&L.

---

## 1. What this module is

Replaces a manually-maintained Google Sheet that tracks the software business:

- **Income** from clients (MapX, DevArena+DevCourt, freelance, incentives)
- **Employee salaries** paid (4 employees), with the funding client noted per payment
- **Business expenses** — tools, subscriptions, hardware, office
- **Reports** — per-fiscal-year P&L (income − costs = net profit, margin %), monthly/yearly income,
  income by client, remittance vs non-remittance split, per-employee totals across years

**Fiscal year = July → June (Bangladesh standard).** Stored as a string `"YYYY-YYYY"` on every row
and also derivable from the date via a helper.

**Currency: BDT (৳) only** — matches the property module and the Excel as-is. The remittance flag
is captured separately for tax context; no FX conversion stored.

---

## 2. Source spreadsheet analysis

| Sheet | Maps to | Columns | Rows |
| ----- | ------- | ------- | ---- |
| 💰 Earnings Log | `Earning` | Date, Source, Reference (Rem/Non-rem), Amount, Fiscal Year | 136 |
| 👤 Employee Expenses | `EmployeePayment` | Date, Employee Name, Type (Salary), Reference (funding client), Amount, Fiscal Year | 74 |
| 🛠️ Business Expenses | `BizExpense` | Date, Tool/Service, Category, Is Recurring?, Amount, Fiscal Year | 2 |
| ⚙️ Settings | config tables | Employee Names, Income Sources, Expense Categories | — |
| 🔄 Subscriptions | — | empty, ignored | 0 |
| 📊 Dashboard | reports (not stored) | Per-FY P&L + per-employee × FY breakdown (computed) | — |

### Decoded facts

- **Income sources (clients):** `MapX` (৳22,800,000 / 92 payments — primary), `DevArena+DevCourt`
  (৳4,100,000 / 24), `Freelance project` (৳1,650,000 / 13), `Incentive` (৳800,000 / 7).
- **Earnings `Reference`** = `Rem` (remittance — foreign income via official banking channel) or
  `Non-rem`. Modeled as enum `RemittanceType { REM, NON_REM }`.
- **Employees:** John Doe (৳1,420,000 / 44), Jane Smith (৳1,180,000 / 11),
  Robert Johnson (৳960,000 / 14), Emily Davis (৳540,000 / 5).
- **Employee payment `Reference`** = funding client/source (savannah, Christopher, Michael, David…) —
  free text, kept as `reference` string.
- **Expense categories (config):** AI Tool Subscription, Software License, Hardware,
  Office/Electricity, Social.
- **Fiscal years present:** `2023-2024`, `2024-2025`, `2025-2026`.

### Dashboard reports to reproduce

1. **Business Performance Summary** — per FY: `Income`, `Emp Costs`, `Tool/Subs`,
   `Net Profit = Income − (Emp + Tools)`, `Margin % = Net Profit / Income`.
2. **Payment Breakdown by Employee** — `Employee × Fiscal Year → Total Paid`.

---

## 3. Data model (Prisma — dedicated models)

Added to `prisma/schema.prisma`. The former generic `Income` model + `IncomeCategory` enum were
**removed** (verified unused). The `Expense` model is **kept** — it backs the property expense
tracker (`db.expense` is used in property dashboard/expenses/services). Migration:
`20260613000000_add_financial_tracker` (drops `Income`, adds the 6 models below).

```prisma
model Employee {
  id        String            @id @default(cuid())
  name      String            @unique
  isActive  Boolean           @default(true)
  notes     String?
  payments  EmployeePayment[]
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
}

model IncomeSource {            // client / income origin
  id        String    @id @default(cuid())
  name      String    @unique
  notes     String?
  earnings  Earning[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model BizExpenseCategory {
  id        String       @id @default(cuid())
  name      String       @unique
  expenses  BizExpense[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model Earning {
  id         String         @id @default(cuid())
  date       DateTime
  sourceId   String
  source     IncomeSource   @relation(fields: [sourceId], references: [id])
  remittance RemittanceType @default(NON_REM)
  amount     Decimal        @db.Decimal(12, 2)   // BDT
  fiscalYear String                              // "2023-2024"
  notes      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  @@index([fiscalYear])
  @@index([sourceId])
}

model EmployeePayment {
  id         String      @id @default(cuid())
  date       DateTime
  employeeId String
  employee   Employee    @relation(fields: [employeeId], references: [id])
  type       PaymentKind @default(SALARY)
  reference  String?                             // funding client e.g. "savannah"
  amount     Decimal     @db.Decimal(12, 2)      // BDT
  fiscalYear String
  notes      String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  @@index([fiscalYear])
  @@index([employeeId])
}

model BizExpense {
  id          String             @id @default(cuid())
  date        DateTime
  name        String                              // tool / service
  categoryId  String
  category    BizExpenseCategory @relation(fields: [categoryId], references: [id])
  isRecurring Boolean            @default(false)
  amount      Decimal            @db.Decimal(12, 2) // BDT
  fiscalYear  String
  notes       String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  @@index([fiscalYear])
}

enum RemittanceType { REM NON_REM }
enum PaymentKind    { SALARY BONUS ADVANCE OTHER }
```

`src/lib/fiscalYear.ts` — `fiscalYearOf(date): string` (July cutoff) + `fiscalYearRange(fy)` helpers.

---

## 4. API routes (`src/app/api/admin/finance/`)

All return `{ data, error }`; all check `auth()` at the top (401 if missing); all validate input.

| Route | Methods | Purpose |
| ----- | ------- | ------- |
| `earnings/route.ts` | GET (filter by FY/source), POST | list/create earnings |
| `earnings/[id]/route.ts` | PUT, DELETE | edit/delete earning |
| `employees/route.ts` | GET, POST | employee config |
| `employees/[id]/route.ts` | PUT, DELETE | edit/deactivate |
| `payments/route.ts` | GET (filter), POST | employee salary payments |
| `payments/[id]/route.ts` | PUT, DELETE | edit/delete payment |
| `expenses/route.ts` | GET, POST | business expenses |
| `expenses/[id]/route.ts` | PUT, DELETE | edit/delete |
| `sources/route.ts` + `[id]` | GET/POST/PUT/DELETE | income source config |
| `categories/route.ts` + `[id]` | GET/POST/PUT/DELETE | expense category config |
| `dashboard/route.ts` | GET | aggregated P&L + per-employee + trends |

---

## 5. UI (MUI, under `(admin)/admin/finance/`)

Tabbed module mirroring the property module's conventions (`<Box role="navigation">`, `sx` only,
theme tokens only, no Tailwind, no `<form>` element).

- `/admin/finance` → **Dashboard**: per-FY P&L cards + table, margin %, income-by-client,
  remittance split, monthly income chart (recharts, same pattern as property dashboard), per-employee table.
- `/admin/finance/earnings` — earnings table, FY filter, add/edit dialog.
- `/admin/finance/payments` — employee payments table + per-employee totals, FY filter, add/edit.
- `/admin/finance/expenses` — business expenses table, add/edit, recurring badge.
- `/admin/finance/settings` — manage employees, income sources, expense categories.

---

## 6. Seeder

`prisma/seed-financial.ts` (or a guarded section in the main seed) imports
`prisma/data/financial-tracker.json` — all 212 rows exported from the Excel
(136 earnings + 74 payments + 2 expenses) plus config lists. Idempotent (upsert by natural key /
already-seeded guard, matching the existing seed's transaction + guard pattern). The JSON is
committed so the import is reproducible without the .xlsx.

---

## 7. Phase plan & progress tracker

| Phase | Deliverable | Status |
| ----- | ----------- | ------ |
| 0 | Excel analysis + plan + this doc | ✅ done (2026-06-13) |
| 1 | Prisma models + migration + `fiscalYear.ts` helper + update PROJECT_PLANNING.md schema table | ✅ done (2026-06-13) |
| 2 | Export Excel → `financial-tracker.json` + seeder (212 rows + config) | ✅ done (2026-06-13) — all 9 verification targets reconcile |
| 3 | API routes — earnings, payments, expenses, config, dashboard | ✅ done (2026-06-13) — service layer `src/services/finance/` + 13 route handlers; dashboard reconciles to Excel |
| 4 | Dashboard page (P&L, margins, charts, per-employee, remittance split) | ✅ done (2026-06-13) — `FinanceDashboardPage` + `FinanceCharts` (recharts) |
| 5 | CRUD pages — earnings, payments, expenses | ✅ done (2026-06-13) — Drawer add/edit, FY filter, create+delete verified via API |
| 6 | Settings page — employees / sources / categories config | ✅ done (2026-06-13) — `FinanceSettingsPage`; delete guarded when referenced |
| 7 | Wire AI assistant tools (optional); final polish | 🔲 — see notes below |

### Phase 7 candidates (optional)

- Add Claude tool calls in `api/admin/ai/route.ts`: `get_finance_summary`, `get_income_by_client`,
  `get_employee_payments`, `get_pnl_by_fiscal_year` (depends on Lesson 1.4 tool-use work).
- Year-over-year growth indicators on the dashboard cards.

---

## 10. Enhancement round 2 (2026-06-13 — user feedback) ✅ complete

Decisions: **Subscription entity + monthly auto-charge**; **confirm dialog on delete only**.

| Phase | Deliverable | Status |
| ----- | ----------- | ------ |
| 8 | Reusable `ConfirmDialog` (themed) replacing `window.confirm`; **default every list page to the current fiscal year** (switch to past years / All) | ✅ done (2026-06-13) — `src/components/admin/ConfirmDialog.tsx`; earnings/payments/expenses/settings all default to current FY + themed delete confirm |
| 9 | `Subscription` model + migration; monthly auto-charge generation (idempotent, like property rent); APIs; Subscriptions page — start, **stop from a month**, per-month spend history, start date + Active/Ended status; generated charges flow into reports automatically | ✅ done (2026-06-13) — migration `20260613100000_add_subscriptions`; `services/finance/subscriptions.ts`; `/admin/finance/subscriptions` page; generation also runs on expenses/dashboard reads; verified create→4 charges, stop, resume, delete cascade |
| 10 | Dashboard **date-range filter** — This month / Last 3 / Last 6 / Last 1yr / Last 2yr / This FY (default) / All | ✅ done (2026-06-13) — `getFinanceDashboard({from,to})`; verified June-2026=৳0, FY=৳9,750,000, All=৳29,350,000 |
| 11 | **PDF downloads** — per-row salary receipt, earning receipt, expense receipt + dashboard report PDF (`@react-pdf/renderer`, mirrors property receipt route) | ✅ done (2026-06-13) — `services/finance/pdfKit.tsx` + 4 routes; per-row Download buttons; report PDF honors the active date range. BDT rendered as "BDT n" (standard fonts lack ৳) |
| 12 | Verify (build/lint/typecheck + reconcile); update this doc + PROJECT_PLANNING | ✅ done (2026-06-13) — build/lint/tsc clean; authenticated HTTP smoke tests for ranges, PDFs, and full subscription lifecycle all pass |

## 12. Enhancement round 4 (2026-06-14 — bulk PDF export, richer headers, employee phone) ✅ complete

- **Business letterhead on all PDFs:** every receipt, statement and report carries a `BusinessHeader`
  (name, tagline, address, phone, email). The values are an **admin-editable singleton**
  (`BusinessProfile` model + migration `20260614100000_add_business_profile`; service in
  `src/services/admin/businessProfile.ts`; API `GET/PUT /api/admin/finance/business-profile`), edited
  under **Financial Tracker → Settings → Business Profile** and fetched per PDF render. Falls back to
  defaults until set.
- **Employee phone:** added `Employee.phone` (migration `20260614000000_add_employee_phone`, applied via
  `db execute`); captured in the Settings employee form, shown in the employees list, and printed on the
  salary receipt ("Employee phone").
- **Bulk "Download all" PDF** for every list that has per-row downloads, honoring the active filters:
  - `GET /api/admin/finance/earnings/pdf` (Earnings Statement)
  - `GET /api/admin/finance/payments/pdf` (Salary Payments Statement)
  - `GET /api/admin/finance/expenses/pdf` (Business Expenses Statement)
  - `GET /api/admin/property/payments/pdf` (Rent Collection Statement)
  - Rendered by a reusable `ListDocument` (paginates automatically; e.g. 136 earnings → 2 pages),
    each with a totals row. "Download all" buttons added to the four list-page toolbars.
- Verified: PDF text extraction confirms the business header + employee phone + totals appear; all 4
  exports return valid multi-page PDFs. build + lint + tsc clean.

## 11. Enhancement round 3 (2026-06-13 — clients on salaries) ✅ complete

Decisions: **unified client list** (rename "Income Sources" → **Clients**; one list for earnings +
salaries); salary form uses a **multi-select of clients + optional free-text note**.

- Schema: many-to-many `EmployeePayment` ↔ `IncomeSource` via implicit relation `PaymentClients`
  (join table `_PaymentClients`). `reference` repurposed as the optional note. Migration
  `20260613200000_add_payment_clients` (applied directly via `db execute` — local DB history was
  out of sync from the reset; the migration file is committed for clean deploys).
- Services/API: `createEmployeePayment`/`updateEmployeePayment` accept `clientIds[]`
  (connect / `set`); `getEmployeePayments` returns `clients: {id,name}[]`.
- UI: Salaries page has a MUI multi-select (chips) of clients + a "Note (optional)" field; the table
  shows client chips. Settings section relabeled **Clients**; earnings field relabeled **Client**.
- PDF: salary receipt lists the client(s) and the note.
- Verified over HTTP: create with 2 clients → update to 1 → receipt PDF → delete, all correct.
- **Existing salary rows** keep their free-text reference as the note (no clients linked); attach
  clients going forward by editing.

> **Note (2026-06-13):** the local dev database was reset during this round (the project's
> `npm run seed` was being edited for property service types and appears to fail partway, leaving
> tables empty). Finance data was re-seeded via `npm run seed:financial` (212 rows) and the admin
> user restored. **Subscriptions do not auto-seed** — they're created via the UI going forward; the
> 2 historical Excel business expenses remain as one-off `isRecurring` rows (not subscriptions).

**Subscription model:** `Subscription { name, categoryId, monthlyAmount, startDate, endDate?(null=active), notes }`.
`BizExpense` gains `subscriptionId?` + `@@unique([subscriptionId, date])` so each active month charges
exactly once (first-of-month date). Stop = set `endDate`; past charges remain as history. Generated
charges are read-only on the Expenses page (managed from the Subscriptions page).

**Legend:** ✅ done · 🔧 in progress · 🔲 not started

---

## 8. Verification targets (must match Excel after seed)

| Check | Expected |
| ----- | -------- |
| Total income, all FYs | ৳29,350,000 |
| FY 2023-2024 income | ৳9,200,000 |
| FY 2024-2025 income | ৳10,400,000 |
| FY 2025-2026 income | ৳9,750,000 |
| MapX total | ৳22,800,000 (92 rows) |
| John total paid | ৳1,420,000 (44 rows) |
| Jane total paid | ৳1,180,000 (11 rows) |
| Earnings row count | 136 |
| Employee payment row count | 74 |

---

## 8b. Files delivered

```
prisma/schema.prisma                         6 models + 2 enums (RemittanceType, PaymentKind)
prisma/migrations/20260613000000_add_financial_tracker/
prisma/data/financial-tracker.json           212 rows + config, exported from the Excel
prisma/seed-financial.ts                      idempotent seeder (also called by prisma/seed.ts)
src/lib/fiscalYear.ts                         July→June helpers
src/services/finance/                         earnings, payments, bizExpenses, config, dashboard (+ index, _serializers)
src/app/api/admin/finance/                    13 route handlers (CRUD + dashboard)
src/app/(admin)/admin/finance/                page.tsx + FinanceDashboardPage + FinanceCharts + format.ts + types.ts
  earnings/  payments/  expenses/  settings/  each: page.tsx + <Entity>Page.tsx
src/components/admin/AdminSidebar.tsx          "Financial Tracker" group w/ 5 sub-links
```

Run the seeder: `npm run seed:financial` (or `npm run seed` for everything).

## 9. Decisions locked (2026-06-13)

- Dedicated Prisma models (not reusing property `Income`/`Expense`).
- BDT only; remittance flag captured, no FX stored.
- Editable DB config tables for employees / sources / categories.
- Full module, delivered in the phases above.
- Home: `/admin/finance` (replaces stub); sidebar label may become "Financial Tracker".
