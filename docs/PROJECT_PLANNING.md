# PROJECT_PLANNING.md — sshakil.com

**Owner:** Syful Islam Shakil  
**Domain:** sshakil.com  
**Repo:** https://github.com/invshakil/personalized-ai-assistant-with-portfolio  
**Last updated:** 2026-06-24

> This is the living project document. Update the **Progress** section as you implement features.
> Claude Code should read this at the start of every session.

---

## Project overview

A single Next.js application serving two purposes:

1. **Public portfolio** at `/` — Syful's work, experience, skills, and contact info for clients and employers.
2. **Private admin panel** at `/admin` — property management, finance tracking, renovation tracking, and an AI assistant powered by Claude.

---

## Architecture decisions

| Decision          | Choice                               | Reason                                                                                                                                        |
| ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16 App Router                | SSR for portfolio SEO; server components reduce client JS                                                                                     |
| Auth              | NextAuth v5 credentials              | Single admin user — no need for OAuth complexity                                                                                              |
| Database          | PostgreSQL + Prisma 5                | Relational data (units→tenants→payments); Prisma gives type safety                                                                            |
| Portfolio styling | SCSS modules + Tailwind CSS v4       | SCSS for variables, mixins, section partials; Tailwind for utility classes                                                                    |
| Admin styling     | Material UI v9 + emotion             | Professional dark dashboard UI; scoped to `/admin` — no conflict with portfolio Tailwind                                                      |
| AI                | Provider seam (Claude adapter today) | Vendor-neutral `AiProvider` interface; provider/model/key chosen in Settings → AI, key encrypted in DB. OpenAI/Gemini = future adapter files. |
| Hosting           | DigitalOcean Basic droplet (~$12/mo) | Full control, PM2 + Nginx + Certbot for SSL                                                                                                   |
| Session           | JWT (not DB sessions)                | Simpler for single-user setup; no session table needed                                                                                        |

### Styling isolation

The two styling systems are strictly separated by surface — they do not mix:

- **Portfolio** (`/`, `/about`, etc.) — Tailwind v4 utility classes + SCSS partials. CSS tokens in `globals.css`.
- **Admin** (`/admin/*`) — MUI v9 components with `sx` prop. All colors from `adminTheme.ts`. MUI is loaded via `AdminShell.tsx` which provides `ThemeProvider` + `CssBaseline` scoped to the admin layout.
- **Login** (`/admin/login`) — Outside the `(admin)` route group (no sidebar). Has its own inline `ThemeProvider` in `LoginPage.tsx`.

---

## Database schema summary

Defined in `prisma/schema.prisma`. Do not modify schema without updating this document.

| Model                                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`                                    | NextAuth user (single admin); has `password` (bcrypt hash)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Account`, `Session`, `VerificationToken` | NextAuth internals                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `SiteSettings`                            | Singleton — admin-editable portfolio content (availability, bio, CV URL)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `AdminThemeSettings`                      | Singleton — admin dashboard appearance (mode, primaryColor, cardShadow/Border, borderRadius, density, fontSize); drives `createAdminTheme()`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Unit`                                    | 13 flats (Flat 1A–5A); `unitNumber String`, `floor String`, `monthlyRent Decimal`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Tenant`                                  | Nullable `unitId` (external members); `tenantCode T01-T07`; `advanceAmount Decimal`; `isExternal`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Payment`                                 | `rentDue`, `amountPaid`, `advanceApplied`; unique `[tenantId, month, year]`; `receiptNumber`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PaymentTransaction`                      | Audit log per transaction — `TransactionType` enum (CASH/BANK_TRANSFER/ADVANCE_APPLIED/…)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `AddOnService`                            | Service catalog (WiFi, Parking, Generator…)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `TenantService`                           | Per-tenant service fee (same service can cost different amounts per tenant); `@@unique[tenantId, serviceId]`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RentChange`                              | Scheduled rent increases — `effectiveDate`, `appliedAt` (null = pending, set by payment generation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `OneOffCharge`                            | One-time, non-recurring charge billed to a tenant for one month (maintenance fee, repair); `label`, `amount`, `month`, `year`; linked to a `Payment` by `(tenantId, month, year)`; folded into `rentDue` at generation and kept in step on add/edit/delete                                                                                                                                                                                                                                                                                                         |
| `Expense`                                 | Maintenance, utility, salary, subscription expenses; `expenseDate`, `paidTo`, `paymentMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `RenovationItem`                          | Construction cost line items with category, amount, vendor, status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Employee`                                | Financial Tracker — business employees (config); `name` unique, `isActive`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `IncomeSource`                            | Financial Tracker — client/income source config (Acme Corp, Globex Inc…); `name` unique                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `BizExpenseCategory`                      | Financial Tracker — tool/subscription expense category config; `name` unique                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Earning`                                 | Financial Tracker — client income; `sourceId`, `remittance` (REM/NON_REM), `amount` (BDT), `currency`/`originalAmount`/`fxRate` (multi-currency), `realizedAt`/`realizedAmount`/`realizedRate`/`transferEntryId` (realized-basis: foreign income counts only once converted), `fiscalYear`                                                                                                                                                                                                                                                                         |
| `EmployeePayment`                         | Financial Tracker — salary payments; `employeeId`, `type`, `amount`, `fiscalYear`, `reference` (note); m2m `clients`→`IncomeSource` (`PaymentClients`)                                                                                                                                                                                                                                                                                                                                                                                                             |
| `BizExpense`                              | Financial Tracker — business expenses; `categoryId`, `isRecurring`, `amount`, `fiscalYear`, `subscriptionId?`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Subscription`                            | Financial Tracker — recurring service; `monthlyAmount` (starting rate), `startDate`, `endDate?`; auto-generates monthly `BizExpense` charges                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `SubscriptionRateChange`                  | Effective-dated price hike/drop for a subscription; `effectiveMonth`, `monthlyAmount`; applies from that month onward. Unique `[subscriptionId, effectiveMonth]`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `SubscriptionMonthOverride`               | Per-month final-amount override (discount/coupon/free month); `month`, `amount`, `note?`. Unique `[subscriptionId, month]`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `AiProviderConfig`                        | AI provider seam — one row per provider (anthropic/openai/google); `defaultModel`, `isActive` (one at a time), `enabled`, optional `baseUrl`; API key AES-256-GCM encrypted (`apiKeyEnc`/`apiKeyIv`/`apiKeyTag`)                                                                                                                                                                                                                                                                                                                                                   |
| `ChatSession`                             | AI assistant conversation; `title` (auto from first message), timestamps; has many `ChatMessage`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ChatMessage`                             | A persisted chat turn; `sessionId` (cascade delete), `role` (`ChatRole` USER/ASSISTANT), `content`. Stores user + assistant **text** turns only (no tool round-trips)                                                                                                                                                                                                                                                                                                                                                                                              |
| `AiUsage`                                 | One row per chat turn — token counts + computed `costUsd` (USD). Powers the dashboard spend panel and budget enforcement                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `AiBudget`                                | Monthly AI spend cap (singleton); `monthlyLimitUsd?`, `enforce`. When enforced and month-to-date ≥ limit, the chat route blocks new turns                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `BackupSettings`                          | DB-backup config (singleton); `frequency` (off/daily/weekly), `retentionCount`, last-run status, + encrypted Google Drive OAuth refresh token (`driveToken*`), connected email, folder id                                                                                                                                                                                                                                                                                                                                                                          |
| `BackupRecord`                            | One row per backup attempt; `filename`, `sizeBytes`, `location` (local/local+drive), `driveFileId?`, `trigger`, `status`/`error`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `MoneyAccount`                            | Money Manager — personal account (cash/bank/mobile wallet/credit card); `openingBalance`, `creditLimit?` (card). Balance derived from the ledger                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `MoneyCategory`                           | Money Manager — personal income/expense category; `kind` (INCOME/EXPENSE). Unique `[name, kind]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `MoneyEntry`                              | Money Manager — the single personal ledger: `direction` (CREDIT/DEBIT/TRANSFER), `amount`, optional `categoryId` (null for transfers), `accountId?`, `transferAccountId?` (transfers), `beneficiaryId?`/`obligationId?` (payments to people), `feeForTransferId?` (self-relation: a transfer's fee is a separate EXPENSE DEBIT on the source account, `onDelete: Cascade` so deleting the transfer removes its fee), `method?` (CREDIT-only: CASH/BANK_TRANSFER/MOBILE_BANKING/CHEQUE/OTHER — how a deposit arrived), `source` (MANUAL/IMPORTED), `importBatchId?` |
| `Beneficiary`                             | Money Manager — a person you pay (allowance/loan); `relationship?`, soft-deleted via `isActive`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `BeneficiaryObligation`                   | Money Manager — a `RECURRING` allowance or `LOAN` (principal); `direction` (OWED_BY_ME/OWED_TO_ME), `status`. Loan outstanding = principal − Σ repayments                                                                                                                                                                                                                                                                                                                                                                                                          |
| `MoneyImportBatch`                        | Money Manager — one CSV import (reversible); `fileName`, `rowCount`, `mapping` (JSON). Deleting it rolls back its entries                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `SolarSettings`                           | Solar — singleton; non-secret config: `systemSizeKwp?`, `batteryKwh?`, `installCost` (payback), `installDate?`, `latitude?`/`longitude?` (weather), `co2FactorKgPerKwh`, `currency`, auto-discovered `stationId`, last-sync status. Solis credentials live in env, never here                                                                                                                                                                                                                                                                                      |
| `ElectricityTariff`                       | Solar — effective-dated tariff version (mirrors `SubscriptionRateChange`); `effectiveFrom` (1st of month), `distributor` (BPDB), `demandChargePerKw` (flat monthly), `vatPercent`. Has many `TariffSlab`. The version in force for a month is the latest `effectiveFrom <=` it                                                                                                                                                                                                                                                                                     |
| `TariffSlab`                              | Solar — one cumulative consumption band of a tariff; `fromUnit`, `toUnit?` (null = unbounded top band), `rate` (BDT/kWh). Cascade-deleted with the tariff                                                                                                                                                                                                                                                                                                                                                                                                          |
| `FxRate`                                  | Multi-currency — cached live BDT rate per foreign currency (`base`=BDT, `quote`, `rate`, `asOf`); valuing foreign account balances + a daily fetch cache (`src/services/_shared/fx.ts`, source `open.er-api.com`)                                                                                                                                                                                                                                                                                                                                                  |
| `SolisDailyReading`                       | Solar — one row per inverter per day (read-only SolisCloud telemetry); generation/grid import+export/battery charge+discharge/consumption (kWh), `peakPowerKw`, SOC min/max, temp, `raw` JSON. Unique `[inverterSn, date]`                                                                                                                                                                                                                                                                                                                                         |

Currency: **BDT (Bangladeshi Taka ৳)** is the canonical/reporting currency throughout. The
**multi-currency** seam (2026-06-30) lets the business record foreign income/salaries and hold
foreign-currency accounts while every report stays in BDT:

- `Earning` / `EmployeePayment` gain `currency` + `originalAmount` + `fxRate` (BDT per 1 unit). `amount`
  **stays BDT-canonical** (= `round(originalAmount × fxRate, 2)`, computed server-side) so all `groupBy`
  `_sum: { amount }` reports are unchanged; the foreign original shows alongside in lists/receipts.
- `MoneyAccount` gains `currency` (one per account; its balance is in that currency). `MoneyEntry` gains
  `toAmount` (destination amount for cross-currency transfers, in the destination currency) + `fxRate`.
  Account balances stay native; the Money dashboard converts to a combined BDT total at the latest rate.
- `FxRate` caches the live BDT rate per foreign currency (source: `open.er-api.com`, free/no-key). The
  shared util `src/services/_shared/fx.ts` fetches/caches it; route `GET /api/admin/fx-rate?from=USD`
  prefills the editable rate on a foreign transaction. Per-transaction rates are stored on the row;
  the `FxRate` cache is only for valuing current balances.

**Realized-basis foreign income (2026-06-30).** Foreign income is **recognized only when converted to
BDT**, not when earned. `Earning` gains `realizedAt` / `realizedAmount` / `realizedRate` / `transferEntryId`:
a foreign earning is **pending** (`realizedAt` NULL, excluded from the BDT P&L) until a **Convert to BDT**
action realizes it. BDT earnings are realized-on-earn (`realizedAt`=`date`, backfilled for all history, so
report numbers are unchanged to the cent). Conversion (`convertEarnings`, multi-select) posts **one**
cross-currency Money transfer (foreign account → BDT account) at the actual rate and splits the realized BDT
back onto each earning. **All earning-income aggregations now go through `src/services/finance/_realized.ts`**
(`getRealizedEarnings`) — summing `realizedAmount` bucketed by `realizedAt` (conversion period) — in
`dashboard.ts`, `reports.ts`, and `admin/overview.ts`. `reverseConversion` undoes it. Employee salary payments
remain counted at pay-date (realized basis is income-only for now).

All other `Decimal` fields are BDT.

> **Note:** the former generic `Income` model + `IncomeCategory` enum were removed (unused). The
> business-finance domain now uses the dedicated Financial Tracker models above. The `Expense` model
> is retained — it backs the property expense tracker. See `FINANCIAL_TRACKER.md` for the full design.

---

## Folder structure (current state)

```
sshakil-app/
├── prisma/
│   ├── schema.prisma              ✅ complete (User.password added)
│   ├── migrations/                ✅ baseline migration committed
│   └── seed.ts                    ✅ upserts admin user with bcrypt hash
├── public/
│   └── shakil-profile.jpg         ✅ profile photo (used by Hero)
├── src/
│   ├── app/
│   │   ├── (portfolio)/
│   │   │   ├── layout.tsx         ✅ complete (Nav, Footer, 3× JSON-LD scripts)
│   │   │   └── page.tsx           ✅ complete (renders all 7 section components)
│   │   ├── (admin)/               ← auth-gated; wraps all /admin/* routes
│   │   │   ├── layout.tsx         ✅ server — auth check + loads theme settings, passes to AdminShell
│   │   │   ├── AdminShell.tsx     ✅ "use client" — AppRouterCacheProvider + AdminThemeProvider + flex layout
│   │   │   └── admin/
│   │   │       ├── page.tsx           ✅ /admin — imports OverviewPage
│   │   │       ├── OverviewPage.tsx   ✅ live cross-domain dashboard (getAdminOverview): KPI row, finance + property quick views, top dues, AI spend, quick access
│   │   │       ├── AiSpendPanel.tsx   ✅ AI spend cards + monthly-cost bar chart
│   │   │       ├── property/          ✅ complete — Units & Tenants, payments, expenses, services, payees, service-types, settings, [tenants/units]/[id]
│   │   │       ├── finance/           ✅ complete — earnings, payments (salaries), expenses, subscriptions, settings (page.tsx redirects → /finance/earnings)
│   │   │       ├── reports/           ✅ Reports hub — financial/ + property/ + solar/; page.tsx → /reports/financial
│   │   │       ├── renovation/        🔲 stub (MUI StubPage)
│   │   │       ├── ai-assistant/      ✅ MUI chat UI — streaming, provider-swappable, tool use, ConversationList
│   │   │       ├── settings/          ✅ Site Settings; settings/ai (AI provider + budget); settings/appearance (theme)
│   │   │       └── account/           ✅ profile + password
│   │   ├── admin/                 ← NOT inside (admin) group — no sidebar, no auth layout
│   │   │   └── login/             ✅ MUI form with inline ThemeProvider + CssBaseline
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  ✅ complete
│   │   │   └── admin/             ✅ overview, account, settings, theme, ai/* (config, sessions, usage, budget),
│   │   │       │                     finance/* (earnings, payments, expenses, subscriptions/* incl. rate-changes + overrides, …),
│   │   │       │                     property/* — all thin handlers delegating to src/services/<domain>/
│   │   ├── layout.tsx             ✅ root layout (fonts, SEO metadata, imports Tailwind + SCSS)
│   │   └── page.tsx               ✅ root → re-exports portfolio page
│   ├── components/
│   │   ├── portfolio/
│   │   │   ├── Hero.tsx           ✅ photo, badge, stats, CTAs
│   │   │   ├── Skills.tsx         ✅ 5 skill groups, tag pills
│   │   │   ├── Experience.tsx     ✅ full-time + freelance columns
│   │   │   ├── Projects.tsx       ✅ 4 cards, icons, GitHub link
│   │   │   ├── Testimonials.tsx   ✅ 2 Upwork reviews, stars
│   │   │   ├── Education.tsx      ✅ 3 entries, flat flex layout
│   │   │   └── Contact.tsx        ✅ 5 links, SVG icons, dark bg
│   │   ├── admin/                 ← all MUI — shared across admin routes
│   │   │   ├── AdminSidebar.tsx   ✅ MUI List nav, sticky, collapsible groups, <Box role="navigation"> (no top-level Reports item — Solar/Property/Finance each carry their own Reports child)
│   │   │   ├── AdminHeader.tsx    ✅ MUI Box header — breadcrumb + light/dark toggle + user avatar
│   │   │   ├── AdminThemeProvider.tsx ✅ "use client" — theme context (live preview + persist) wrapping ThemeProvider
│   │   │   ├── AdminBreadcrumb.tsx ✅ MUI Typography breadcrumb
│   │   │   ├── PageHeader.tsx     ✅ MUI Typography h5 + subtitle
│   │   │   ├── ConfirmDialog.tsx  ✅ themed delete-confirmation dialog
│   │   │   ├── StubPage.tsx       ✅ MUI Card "Coming soon" — used by renovation
│   │   │   ├── ChatMessage.tsx    ✅ MUI Avatar + Box chat bubble
│   │   │   ├── PayeeDocuments.tsx / TenantDocuments.tsx ✅ upload/list document widgets
│   │   │   └── StatCard.tsx / FormField.tsx  (legacy helpers)
│   │   └── shared/
│   │       ├── Nav.tsx            ✅ "use client", hamburger menu
│   │       └── Footer.tsx         ✅ server component
│   ├── styles/
│   │   ├── _variables.scss        ✅ colors, fonts, breakpoints, spacing
│   │   ├── _functions.scss        ✅ rem(), alpha()
│   │   ├── _mixins.scss           ✅ respond-to, section-padding, gradient-rule, btn-base
│   │   ├── _base.scss             ✅ reset, :root, keyframes, animation classes
│   │   ├── _sections.scss         ✅ .sec, .sec-in, .lbl
│   │   ├── _nav.scss              ✅ navigation styles (note: `nav { position: fixed }` is global)
│   │   ├── _hero.scss             ✅
│   │   ├── _skills.scss           ✅
│   │   ├── _experience.scss       ✅
│   │   ├── _projects.scss         ✅
│   │   ├── _education.scss        ✅
│   │   ├── _testimonials.scss     ✅
│   │   ├── _contact.scss          ✅
│   │   ├── globals.scss           ✅ @use orchestrator
│   │   └── tailwind.css           ✅ isolated Tailwind @import
│   ├── services/                  ← server services: business logic + Prisma (used by API routes + AI tools)
│   │   ├── admin/                 ✅ account, siteSettings, businessProfile, themeSettings, overview
│   │   ├── finance/               ✅ earnings, payments, bizExpenses, subscriptions, config, dashboard, reports, pdfKit
│   │   ├── property/              ✅ units, tenants, payments, expenses, services, payees, reports, dashboard, …
│   │   ├── ai/                    ✅ provider seam — registry, adapters/anthropic, config, crypto, tools, sessions, usage, pricing
│   │   └── _shared/dateRange.ts   ✅ relative period-token → {from,to} resolver
│   ├── lib/
│   │   ├── auth.ts                ✅ NextAuth config — bcrypt verify, APP_VERSION invalidation
│   │   ├── db.ts                  ✅ Prisma singleton
│   │   ├── adminTheme.ts          ✅ createAdminTheme(settings) factory (light/dark) + DEFAULT_THEME_SETTINGS
│   │   ├── fiscalYear.ts          ✅ FY helpers (July→June)
│   │   └── api/                   ✅ Axios client layer — client, admin, finance, property, ai
│   ├── middleware.ts               ✅ protects /admin/* routes
│   └── types/index.ts             ✅ shared TypeScript types
├── .env                           ✅ Prisma CLI env (DATABASE_URL only)
├── .env.local                     ✅ Next.js runtime env (not committed)
├── .env.example                   ✅ safe to commit
├── CLAUDE.md                      ✅ coding standards + conventions
└── PROJECT_PLANNING.md            ✅ this file
```

**Legend:** ✅ done &nbsp;|&nbsp; 🔧 in progress &nbsp;|&nbsp; 🔲 not started

---

## Portfolio section reference

| Component          | Section ID      | Background              | Key content                                                                          |
| ------------------ | --------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `Hero.tsx`         | `#hero`         | `--color-linen`         | Photo, name, tagline, availability badge, 3 CTAs (Hire Me / View Work / Download CV) |
| `Skills.tsx`       | `#skills`       | `--color-sage-light`    | 5 skill groups with tag pills                                                        |
| `Experience.tsx`   | `#experience`   | `--color-slate-light`   | Two columns: full-time left, freelance right                                         |
| `Projects.tsx`     | `#projects`     | `--color-purple-light`  | 4 project cards, private badges, 1 GitHub link                                       |
| `Testimonials.tsx` | `#testimonials` | white                   | 2 Upwork reviews, link to Upwork profile                                             |
| `Education.tsx`    | `#education`    | white                   | 3 entries, flat flex layout                                                          |
| `Contact.tsx`      | `#contact`      | `--color-forest` (dark) | 5 contact links + CV download, dark bg                                               |

All sections use `padding: var(--px)` for horizontal spacing. Do not hardcode padding values.

### Real contact data (use exactly as-is)

- Email: syful.shakil.it@gmail.com
- Phone: +880 1675 332 265
- LinkedIn: linkedin.com/in/syful-shakil/
- GitHub: github.com/invshakil
- Upwork: upwork.com/freelancers/~0136804dec393ef25f
- CV: https://drive.google.com/file/d/15jSzTm3iaj_ghVqgC_t1Wk9bKnsIfGIA/view?usp=sharing

---

## Admin modules

### 1. Property Management (`/admin/property`) ✅ complete (all 9 phases)

**Routes:**

- `/admin/property` — Units & Tenants tabbed view (units grid + tenant table + external members)
- `/admin/property/tenants/[id]` — Tenant profile (advance balance, services, rent changes, payment history)
- `/admin/property/payments` — Monthly payments (auto-generate, record payment, apply advance, transaction log, receipt download)
- `/admin/property/expenses` — Expense tracker with month filter
- `/admin/property/services` — Service catalog + per-tenant assignment (variable per-tenant fees)
- Property report (charts, occupancy, due tracker) now lives under **Reports** → `/admin/reports/property`
  (old `/admin/property/dashboard` redirects there)

**API routes:** `src/app/api/admin/property/` — units, tenants, payments, payments/generate, payments/[id]/transactions, payments/[id]/receipt, expenses, services, services/assign, dashboard

**PDF receipts:** `GET /api/admin/property/payments/[id]/receipt` — A4 PDF with two halves (Tenant Copy + Owner Copy), generated server-side via `@react-pdf/renderer`. Receipt numbers auto-assigned as `RCP-YYYY-NNNN`.

**Key behaviours:**

- Advance stored as BDT amount; can be partially applied to any month
- Monthly payments auto-generate on page load (idempotent); applies pending `RentChange` records first
- Move-out is two-step: preview settlement → admin confirms
- External members (no unit, service-only billing) supported

### 2. Financial Tracker (`/admin/finance`) ✅ complete (Phases 1–6)

Business/agency finance (distinct from property finance). Ported from `Financial Tracker.xlsx`.
See **FINANCIAL_TRACKER.md** for the full design, data model, and progress tracker.

**Routes:**

- `/admin/finance` — redirects to `/admin/finance/earnings`; the P&L dashboard moved to **Reports** →
  `/admin/reports/financial` (per-FY P&L, monthly income + income-by-client charts, salary matrix, remittance)
- `/admin/finance/earnings` — client income log (REM/Non-rem), FY filter, add/edit drawer
- `/admin/finance/payments` — employee salary payments, employee + FY filters; each salary links to
  one or more **clients** (multi-select from the unified client list) + an optional note
- `/admin/finance/expenses` — one-off business expenses; subscription-generated charges shown read-only
- `/admin/finance/subscriptions` — recurring services: start, **stop from a month**, resume, per-month
  spend history, Active/Ended status; each active month auto-generates one expense charge (idempotent).
  **Pricing:** effective-dated **price changes** (hikes/drops) + per-month **overrides** (discounts/coupons)
  via the Manage drawer; charge amounts = override → latest rate change ≤ month → base (see FINANCIAL_TRACKER.md)
- `/admin/finance/settings` — manage employees / income sources / expense categories (DB config)

**Round-2 enhancements (2026-06-13):** all list pages default to the **current fiscal year**; the
dashboard has a **date-range filter** (this month / last 3·6 mo / last 1·2 yr / this FY / all);
**PDF downloads** for each salary, earning, expense + a dashboard **report PDF** (`@react-pdf/renderer`,
`services/finance/pdfKit.tsx`); themed **delete-confirmation dialog** (`components/admin/ConfirmDialog.tsx`)
replacing `window.confirm`.

**Data:** `Employee`, `IncomeSource`, `BizExpenseCategory`, `Earning`, `EmployeePayment`,
`BizExpense` (currency BDT, fiscal year July→June stored per row). Seeded from
`prisma/data/financial-tracker.json` (212 rows) via `npm run seed:financial`. All Excel totals
reconcile (total income ৳29,350,000).

**API:** `src/app/api/admin/finance/` — earnings, payments, expenses, employees, sources,
categories (each + `[id]`), dashboard. Services in `src/services/finance/`.

> Note: the old generic `Income` model + `IncomeCategory` enum were removed (unused).

### 3. Reports (`/admin/reports`) ✅ functional

Centralized reporting hub (sidebar group). Dedicated pages reuse the existing dashboard components:

- `/admin/reports/financial` — Financial Tracker report (per-FY P&L, charts, salary matrix, PDF export)
- `/admin/reports/property` — Property report (charts, occupancy, due tracker)
- `/admin/reports/solar` — Solar Reports (text-first; see Solar Monitoring section)

`/admin/reports` redirects to the financial report. The per-module "Dashboard" links were removed in favour
of this hub; the live cross-domain summary lives on the **Overview** (`/admin`, `getAdminOverview()`).
The top-level **Reports** sidebar entry was removed (redundant with the per-module Reports children).

### Money Manager (`/admin/money`) ✅ complete

Personal/household finance — distinct from the property and business domains. A single **ledger**
(`MoneyEntry`) records every personal flow: income (CREDIT), expenses/payments (DEBIT), and
account-to-account moves (TRANSFER). **Account balances and the savings number are derived purely
from the ledger** (`openingBalance + Σ credits − Σ debits ± transfers`), so they never drift.

- **Accounts** — cash, bank, mobile wallet, **credit card** (owed = negative balance; `availableCredit = creditLimit + balance`). Opening balance seeds the real amount held/owed. Card purchases are DEBITs; paying a bill is a bank→card TRANSFER. A per-row **Deposit** action opens the Ledger's Add Entry drawer pre-filled to that account (CREDIT); a CREDIT entry can optionally record `method` (CASH/BANK_TRANSFER/MOBILE_BANKING/CHEQUE/OTHER) — how the top-up arrived.
- **People & Loans** (`Beneficiary` + `BeneficiaryObligation`) — recurring allowances and loans with a running outstanding balance; `direction` (OWED_BY_ME / OWED_TO_ME) drives the math. Payments are ledger entries tagged with `beneficiaryId`/`obligationId`.
- **Venture income is read-only context** — the dashboard shows Property + Financial Tracker NET take-home per calendar month (via `getPropertyFinancials` / `getMonthlyPnl`) but **never sums it into savings**; you record it as income when it lands in an account (no double-count).
- **CSV import** — column-mapping importer with preview, duplicate detection, and reversible batches (`MoneyImportBatch`).
- **Pages:** Overview dashboard (savings trend + expense-by-category charts, balances, people-owed, venture context), Ledger (entries + transfer action), People & Loans, Accounts, Categories, Import CSV.
- **Service-layer-first** (`src/services/money/`): the same functions back the API routes, read-only **AI tools** (`get_money_overview`, `get_monthly_savings`, `get_personal_expense_breakdown`, `get_account_balances`, `get_people_balances`, `list_money_entries` — scope `/money`), the **`scripts/money.ts` CLI**, and the **`/money` Claude Code slash command**.

### Solar Monitoring (`/admin/reports/solar` + `/admin/settings/solar`) ✅ functional

Home solar via **SolisCloud**. **Read-only by design** — we only pull telemetry, never command the
inverter (no control/write endpoints exist in `src/services/solis/`).

- **Ingestion** (`src/services/solis/`) — a signed (HMAC-SHA1) read-only API client; `fieldMap.ts` is the single place that knows raw Solis field names (verify with `npm run solis:test`). `sync.ts` normalizes a day's flows into `SolisDailyReading` (upsert). It refreshes **today** every run and **backfills missing days** (oldest-first, `BACKFILL_CHUNK`=30/call so a request stays short; reruns skip already-synced days). The in-app scheduler (`scheduler.ts`, from `instrumentation.ts`, ~every 2h, globalThis-guarded) progressively fills history from the install date; the **Backfill history** button in Settings → Solar loops `runSolisSync({from: installDate})` until `remaining` is 0 for an immediate fill. Credentials are env-only (`SOLIS_KEY_ID/SECRET/URL`).
- **Tariffs** (`ElectricityTariff` + `TariffSlab`) — effective-dated BPDB residential slab rates (seeded: pre-June-2026 + the June-2026 BERC revision; editable, verify against your bill). Billing is cumulative over the month; the engine + math live in `src/services/solar/tariff.ts` (unit-tested in `__tests__/tariff.test.ts`).
- **Reports** (`src/services/solar/reports.ts`) — monthly generation, consumption with its source split (solar-direct / battery / grid), grid import/export, battery charge/discharge, would-have-cost vs actual spent, monthly savings, self-sufficiency %, CO₂ avoided, and the **payback/ROI tracker** (% of install cost recovered + projected break-even). Weather via Open-Meteo (`weather.ts`): 7-day forecast + predicted generation.
- **Pages:** Solar Reports and Solar Settings (system info, connection status, **Sync now**, tariff editor). Sidebar parent "Solar" → Reports + Settings.
  - **Solar Reports** (`SolarReportsPage.tsx`) — text-first, no recharts: payback hero tile, stat row, selected-period totals card, stacked **source-split bar** (solar / battery / grid), monthly detail table with inline self-sufficiency % meters, and a 7-day **weather forecast card** at the bottom. Range presets: **1M · 3M · 6M · 12M · All** (each fires a real API call). Weather card has three states: loaded days / API error (red dashed, links to Solar Settings) / no location set (grey dashed).
- **Service-layer-first** (`src/services/solar/`): the same functions back the API routes (`/api/admin/solar/*`), read-only **AI tools** (`get_solar_overview`, `get_solar_report`, `get_solar_payback`, `get_solar_weather`, `list_electricity_tariffs`), local-only **write tools** (`sync_solar_data`, `update_solar_settings`, `add_electricity_tariff` — never write to Solis), and the **`/solar` slash command** (scope filtering).

### 4. Renovation Tracker (`/admin/renovation`)

- Line items from `House_Rebuilding_Construction.xlsx`
- Grand total: ৳12,500,000
- Categories: Materials, Constructor, Services, Other Costs

### 5. AI Assistant (`/admin/ai-assistant`) ✅ functional — provider-swappable + tool use

- Streaming chat UI built with MUI — messages scroll inside a Card, auto-resize TextField input
- **Provider seam** (`src/services/ai/`): a vendor-neutral `AiProvider` interface + adapter layer.
  The chat route resolves the active provider from the DB and streams through it — swapping
  providers is a settings change, not a code change. Only the **Claude (Anthropic)** adapter is
  implemented today (`adapters/anthropic.ts`); OpenAI/Gemini are seeded as inactive placeholders
  (`supported: false`) so adding them later is a new adapter file, no rewrite.
- **Tool use (Lesson 1.4 ✅):** the Anthropic adapter runs a streaming tool-use loop (cap 6 steps).
  Read-only tools in `services/ai/tools.ts` call the same finance/property service functions the
  HTTP API uses — `get_finance_summary`, `list_earnings`, `list_salary_payments`,
  `list_business_expenses`, `list_subscriptions`, `list_employees`, `list_clients`,
  `get_property_dashboard`, `list_units`, `list_tenants`, `list_rent_payments`,
  `list_property_expenses`. Write/mutation tools are intentionally **not** exposed.
- **Report tools (range-aware):** beyond the row-level lists, `services/finance/reports.ts` and
  `services/property/reports.ts` add ~19 pre-aggregated report tools (e.g. `get_monthly_pnl`,
  `get_client_profitability`, `get_fiscal_year_comparison`, `get_property_financials`,
  `get_rent_roll`, `get_arrears_report`, `get_occupancy_report`, `get_combined_income_summary`).
  Financial ones take a **flexible date range** resolved server-side by
  `src/services/_shared/dateRange.ts` — a relative `period` token (`last_3_months`, `this_year`,
  `this_fiscal_year`, …) or explicit `from`/`to`. The chat system prompt includes today's date so
  the model picks the right token. Full catalog in AI_TOOLS_REFERENCE §3.
- **Model:** current model IDs (`claude-sonnet-4-6` default; `claude-opus-4-8`, `claude-haiku-4-5`
  selectable). The old `claude-sonnet-4-20250514` was dropped — it is deprecated (retires 2026-06-15).
- Streaming contract: the route emits **plain UTF-8 text deltas** (matching the existing client);
  errors are surfaced inline as `⚠️ …`. Tool-call events are not written to the text stream.
- **Persisted history** (`ChatSession`/`ChatMessage`, `services/ai/sessions.ts`): the assistant page
  has a conversation list (new / select / delete). Sessions are created lazily on the first message;
  the chat route persists the user prompt + assistant final text after a clean answer (`appendTurn`,
  via the `sessionId` in the request body), auto-titling from the first message. Only **text** turns
  are stored — tool round-trips are not. API: `/api/admin/ai/sessions` (GET/POST) + `/sessions/[id]`
  (GET/PATCH/DELETE); client layer `lib/api/ai.ts`.

### 5b. AI cost tracking & monthly budget ✅ functional

- Each chat turn's token usage (summed across tool-loop rounds) is captured and priced in **USD**
  (`services/ai/pricing.ts` per-model rates incl. cache) into an `AiUsage` row (`recordUsage`).
- **Budget** (`AiBudget` singleton): a monthly USD limit + `enforce` toggle in Settings → AI. When
  enforced and month-to-date spend ≥ limit, the chat route returns `402` **before streaming**
  (`isOverBudget`), and the assistant page shows a banner + disables input.
- **Home dashboard** shows AI-spend cards (this month / budget / remaining / projected month-end) and
  a **monthly-cost bar chart** (`getUsageSummary` → `/api/admin/ai/usage`, rendered by `AiSpendPanel`).
- USD is intentional (Anthropic's billing unit), kept separate from BDT. Full design in
  AI_TOOLS_REFERENCE §7. Routes: `/api/admin/ai/usage` (GET), `/api/admin/ai/budget` (GET/PUT).

### 5a. AI Settings (`/admin/settings/ai`) ✅ functional

- One card per provider: model dropdown, **write-only** API key field (shows "Key set", never the
  secret), optional base URL, enabled switch, **Save**, **Save & set active**, **Test connection**.
- API keys are **AES-256-GCM encrypted at rest** (`services/ai/crypto.ts`, key from
  `AI_CONFIG_SECRET`); the plaintext is never persisted or returned. On first run the Claude key is
  bootstrapped from the legacy `ANTHROPIC_API_KEY` env so existing installs keep working.
- API: `GET/PUT /api/admin/ai/config`, `POST /api/admin/ai/config/test`. Client layer:
  `src/lib/api/ai.ts`. Services: `src/services/ai/config.ts` (list/upsert/activate/test).

### 6. Settings (`/admin/settings`) ✅ functional

- **Site Settings** (`/admin/settings`) — toggle availability for work, edit hero tagline, bio, meta
  description, CV URL. Save updates the `SiteSettings` singleton — reflects live on the public portfolio.
- **Appearance** (`/admin/settings/appearance`) — admin theme control: light/dark/system mode, primary
  colour (presets + hex), card shadow & border, corner radius, density & base font size. Changes preview
  live via `AdminThemeProvider` context; Save persists to the `AdminThemeSettings` singleton. The `(admin)`
  layout server-loads the singleton (`getThemeSettings()`) so there's no flash. A quick light/dark toggle
  lives in `AdminHeader`. Theme is built by `createAdminTheme()` in `src/lib/adminTheme.ts`.
- **Backups** (`/admin/settings/backup`) — database backups via `pg_dump` (custom format). Configure
  **frequency** (off/daily/weekly) + **retention**; **Backup now** on demand; list with download/delete +
  last-run status. An in-process scheduler (`instrumentation.ts` → `backupScheduler.ts`, 30-min tick)
  runs a backup when due (by `lastRunAt`). Optional **Google Drive** offsite copy via OAuth to your own
  account (`services/admin/googleDrive.ts`, plain `fetch` — no `googleapis` dep; scope `drive.file`;
  refresh token AES-256-GCM encrypted). Backups always write locally first, then upload if Drive is
  connected; retention prunes both. Backup files are git-ignored (`/backups/`, `*.dump`).
  Requires the `pg_dump`/`pg_restore` binaries — set **`PG_BIN_DIR`** if they're not on PATH (macOS
  Homebrew libpq: `/opt/homebrew/opt/libpq/bin`; Ubuntu `postgresql-client` is usually on PATH).
  **Google setup:** create an OAuth 2.0 "Web application" client (Drive API enabled) in Google Cloud,
  register redirect `<AUTH_URL>/api/admin/backup/google/callback`, set `GOOGLE_OAUTH_CLIENT_ID/SECRET`,
  then click **Connect Google Drive**. **Download** works for any backup (streams from Drive when the
  local copy is gone). **Restore is guided, not executed from the browser** (destructive): the Restore
  action shows the exact `pg_restore --clean --if-exists -d "$DATABASE_URL" <path>` command (real server
  path) + safety steps (fresh backup → stop app → restore → restart → re-login) to run over SSH.
  **CLI alternative:** `npm run db:restore -- <file-or-directory>` (`scripts/db-restore.ts`) loads
  `DATABASE_URL` from `.env.local`/`.env`, accepts a file or a directory (picks the newest `.dump`),
  confirms by typing the DB name, takes a **safety backup** first, then runs `pg_restore`. Flags:
  `--yes` (skip prompt), `--no-safety-backup`, `--dry-run` (preview only).

### 7. Account (`/admin/account`) ✅ functional

- Update display name
- Change password (bcrypt verify current → hash new → save)

---

## Deployment plan (DigitalOcean)

### Server setup (run once)

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

### Database setup

```bash
sudo -u postgres psql
CREATE DATABASE sshakil_db;
CREATE USER sshakil WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sshakil_db TO sshakil;
\q
```

### App deployment

```bash
git clone https://github.com/invshakil/personalized-ai-assistant-with-portfolio /var/www/sshakil-app
cd /var/www/sshakil-app
cp .env.example .env.local
nano .env.local          # fill in all values
npm install
npx prisma migrate deploy
npm run seed             # creates admin user
npm run build
pm2 start npm --name "sshakil" -- start
pm2 save && pm2 startup
```

### Nginx config

```nginx
server {
    server_name sshakil.com www.sshakil.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL

```bash
certbot --nginx -d sshakil.com -d www.sshakil.com
```

---

## AI Engineering curriculum context

| Lesson | Topic               | Status    | Where implemented                             |
| ------ | ------------------- | --------- | --------------------------------------------- |
| 1.1    | Tokens & cost       | ✅ done   | —                                             |
| 1.2    | Stateless API calls | ✅ done   | —                                             |
| 1.3    | Temperature         | ✅ done   | —                                             |
| 1.4    | Tool use            | ✅ done   | `services/ai/tools.ts` + adapter tool loop    |
| 2.x    | Streaming responses | ✅ done   | AI assistant chat — ReadableStream end-to-end |
| 3.x    | RAG / embeddings    | 🔲 future | TBD                                           |

---

## Progress log

| Date       | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-11 | **Transfer fees** — an account-to-account transfer can now carry a fee the source charges (e.g. a bKash cash-out fee). Optional `fee` (source currency) on `recordTransfer`: the transfer + a separate EXPENSE DEBIT for the fee on the source account are written in one `db.$transaction`, so the source is debited `amount + fee` while the destination still receives the full `toAmount`, and the fee shows up in income/expense/savings as a real expense (category auto-created "Transfer Fee"). New self-relation `MoneyEntry.feeForTransferId` (`onDelete: Cascade`) links the fee to its transfer so deleting the transfer removes the fee — migration `20260711000000_add_transfer_fee_link`. Transfer drawer gains an optional **Fee** field with a live helper (total debited + effective %); `POST /money/transfers` and `moneyApi.transfer` thread `fee`; `record_money_transfer` AI tool gains a `fee` param + preview/summary note. tsc + eslint clean; 3 new money scenario tests (fee debits source amount+fee & books the expense, delete cascades the fee, AI tool passthrough), suite green.                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-09 | **One-off tenant charges** — tenants can now be billed a one-time, non-recurring charge (maintenance fee, repair) alongside a month's rent, distinct from recurring `TenantService` fees. New `OneOffCharge` model (`label`, `amount`, `month`, `year`, `notes`; linked to a `Payment` by `(tenantId, month, year)`) — schema pushed via `prisma db push`. New `src/services/property/oneOffCharges.ts` (CRUD + a pure `computeRentDue` helper + delta-sync that adjusts an already-generated bill's `rentDue`/status on add/edit/delete); `generatePayments` folds the month's charges into `rentDue` (`baseRent + serviceTotal + oneOffTotal + carryForward`), and `getPayments`/`getPayment` surface the charges. Routes `GET/POST /property/one-off-charges` + `PUT/DELETE /property/one-off-charges/[id]`; `propertyApi` client methods. Payments page gains a per-row "one-off charges" drawer (`useOneOffCharges` + `ChargesDrawer`), and `BillBreakdown` shows each charge as its own line (base rent no longer absorbs it). AI tools: `add_one_off_charge` (write) + `list_one_off_charges` (read). tsc + eslint clean; 9 new service tests (pure `computeRentDue` + DB integration for CRUD, delta-sync, and generation inclusion), full suite 58/58 pass.                                                                                                                                                                                                   |
| 2026-07-02 | **Account deposits with a source/method** — added a way to record a top-up/deposit into a Money Manager account with a "how it arrived" tag, distinct from the existing free-text income category. `MoneyEntry` gained `method?` (`MoneyEntryMethod`: CASH/BANK_TRANSFER/MOBILE_BANKING/CHEQUE/OTHER), CREDIT-only (service throws if set on a DEBIT/TRANSFER) — migration `20260702000000_add_money_entry_method`. Accounts page gains a per-row **Deposit** icon action (`?deposit=<accountId>` deep link) that opens the Ledger's existing Add Entry drawer pre-filled to a CREDIT entry for that account; the drawer shows a "Source (how it arrived)" select only for CREDIT, and the ledger table shows the method as a caption under the category. `create_money_entry`/`update_money_entry` AI tools gained the matching `method` param. tsc + eslint clean; runtime-smoked deposit → balance update → edit (method persists) → delete via a headless-browser pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-30 | **Realized-basis foreign income + Withdraw/Convert** — foreign earnings no longer count as BDT income at an estimated rate; they're held as foreign and recognized only when converted. New `Earning` cols `realizedAt`/`realizedAmount`/`realizedRate`/`transferEntryId` (migration `20260630000000_earning_realization`; BDT rows backfilled `realizedAt=date` → reports unchanged to the cent). `convertEarnings` (multi-select) realizes one or more same-currency pending earnings at the actual rate via a single cross-currency Money transfer (foreign acct → BDT acct), splitting realized BDT per earning (rounding reconciled); `reverseConversion` undoes it. New `src/services/finance/_realized.ts` (`getRealizedEarnings`) is the single seam — all earning-income aggregations in `dashboard.ts`/`reports.ts`/`admin/overview.ts` now sum `realizedAmount` bucketed by `realizedAt` (conversion period), with a `pendingForeign` panel. EarningsPage gains a Convert-to-BDT drawer, pending/converted status per row, and a pending-conversion summary; routes `POST /finance/earnings/convert` + `[id]/reverse-conversion`. Money ledger gains a currency filter + per-currency split totals (`getEntries` currency filter). Salary payments stay pay-date basis (income-only). build/lint/tsc clean; 13/13 test:money; runtime-smoked pending→bulk-convert→reverse (income booked in conversion month, balances move, BDT regression to the cent).   |
| 2026-06-30 | **Multi-currency control (Financial Tracker + Money Manager)** — record EUR/USD business income + USD salaries and hold foreign-currency accounts, with all reports staying BDT. New shared `src/services/_shared/fx.ts` (live BDT rate via `open.er-api.com`, cached in new `FxRate` model) + `GET /api/admin/fx-rate`. `Earning`/`EmployeePayment` gained `currency`/`originalAmount`/`fxRate` (amount stays BDT-canonical, computed server-side; reports/dashboards untouched); add/edit drawers get a currency select + editable auto-fetched rate + BDT preview, lists/receipts/PDFs show the foreign original. `MoneyAccount` gained `currency`; `MoneyEntry` gained `toAmount`/`fxRate` for cross-currency transfers; account balances stay native, the Money dashboard converts to a combined BDT total at the latest rate (per-currency breakdown + as-of); savings series convert per-row. `recordLinkedEntry` posts in the destination account's currency. Migration `20260629000000_add_multicurrency` (proper Prisma migration → `migrate deploy` on prod; applied locally via `scripts/apply-migration.ts`). AI tools (`create_money_account` currency, `record_money_transfer` toAmount, `list_earnings`/`list_salary_payments`/`get_account_balances` descriptions) + `scripts/money.ts` CLI updated. tsc + eslint + build clean; 12/12 `test:money` pass (BDT regression intact); runtime-smoked live FX + foreign account + cross-currency transfer. |
| 2026-06-16 | **Database backups (Settings → Backups)** — scheduled `pg_dump` backups with optional Google Drive offsite copy. New `BackupSettings` + `BackupRecord` models + migration. Runner (`services/admin/backup.ts`): pg_dump custom-format → local `BACKUP_DIR` → optional Drive upload → retention prune (local + Drive); graceful error if `pg_dump` missing. Drive via OAuth to the admin's **own** account — `services/admin/googleDrive.ts` uses plain `fetch` against Google OAuth + Drive REST (**no `googleapis` dep**, scope `drive.file`); refresh token AES-256-GCM encrypted (reuses `ai/crypto`). In-process scheduler started from `instrumentation.ts` (30-min tick, runs when due by frequency/lastRunAt). Routes: `/api/admin/backup` (GET/PUT/POST), `/backup/[id]` (download/DELETE), `/backup/google/start                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | callback | disconnect`. UI: frequency/retention, Connect Drive, Backup now, list w/ download+delete. `.env.example`+ CLAUDE.md env table updated;`/backups/`+`\*.dump`git-ignored. Build + lint clean; runtime-smoked settings CRUD + due-logic + graceful pg_dump-missing path (pg_dump unavailable in this env — full dump/upload verified on the droplet). **Restore is guided** (not browser-executed): per-backup Restore dialog shows the exact`pg_restore` command + safety steps; Download falls back to streaming from Drive when the local copy is gone (`backupDir`/`databaseName`exposed on the state;`googleDrive.downloadFile`). |
| 2026-06-16 | **Overview dashboard (real data) + Reports hub** — replaced the mocked Overview (`/admin`) with a live cross-domain snapshot: new `getAdminOverview()` service (`services/admin/overview.ts`) + `GET /api/admin/overview` + `adminApi.getOverview()`. KPI row (this-month business net, property net, subscription run-rate, total rent due), a Financial Tracker quick view (this-month + this-FY income/costs/net), and a Property quick view (rent collected vs expected, expenses, occupancy, top dues). New **Reports** sidebar group with dedicated `/admin/reports/financial` + `/admin/reports/property` pages (reuse the existing dashboard components); removed the per-module “Dashboard” links; old `/admin/finance` → `/admin/finance/earnings` and `/admin/property/dashboard` → `/admin/reports/property` redirects; breadcrumb labels added. Build + lint + tsc clean; runtime-smoked the overview service against the DB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-06-15 | **Subscription pricing — price changes + discounts** — subscriptions can now model effective-dated price hikes/drops and per-month discounts/coupons. New `SubscriptionRateChange` (effective-dated rate) + `SubscriptionMonthOverride` (per-month final amount) models + migration. `generateSubscriptionCharges` rewritten to compute each month's amount as override → latest rate change ≤ month → base and **upsert** the `BizExpense` (re-prices on change), batch-loading existing charges. New service fns `addRateChange`/`deleteRateChange`/`setMonthOverride`/`clearMonthOverride`; routes under `/subscriptions/[id]/rate-changes(/[rcId])` + `/overrides`; `currentMonthlyAmount` exposed on list/detail and used for run-rate (incl. the AI report). Subscriptions page gains a **Manage pricing & history** drawer (price-change add/list/delete + per-month “Adjust” override). Fixed a timezone bug — month strings now parsed by literal components, ISO→month via local components — verified in Asia/Dhaka & America/LA. Build + lint + tsc clean; runtime-smoked the full price-change/override/clear/revert flow.                                                                                                                                                                                                                                                                                                                                |
| 2026-06-15 | **Admin theme customisation** — Appearance settings at `/admin/settings/appearance`: light/dark/system mode, primary colour (presets + hex), card shadow & border, corner radius, density & base font size. Refactored `adminTheme.ts` into `createAdminTheme(settings, resolvedMode)` (added full light palette); new `AdminThemeProvider` context drives live preview + persistence; `AdminThemeSettings` singleton model + service + `PUT /api/admin/theme`; `(admin)` layout server-loads settings (no flash); quick light/dark toggle in `AdminHeader`; Settings sidebar entry now collapsible (Site Settings + Appearance). Build + lint + tsc clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-15 | **AI cost tracking + monthly budget** — meter every chat turn's tokens and price them in USD. New `AiUsage` + `AiBudget` models + migration; `services/ai/pricing.ts` (per-model $/MTok incl. cache) and `services/ai/usage.ts` (`recordUsage`, `getUsageSummary`, `getBudget`/`setBudget`, `isOverBudget`). Anthropic adapter accumulates usage across tool-loop rounds and emits a `usage` stream event; the chat route records it and **blocks with 402 before streaming** when month-to-date ≥ the enforced limit. Settings → AI gains a budget card (limit + enforce + MTD bar); the home dashboard gains AI-spend cards + a monthly-cost bar chart (`AiSpendPanel`); the assistant page shows a banner + disables input when over budget. Routes: `/api/admin/ai/usage`, `/api/admin/ai/budget`. tsc + eslint + build clean; runtime-verified cost math, budget enforcement (over/under), and the 12-month chart series against the DB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-06-15 | **AI report tools (finance + property)** — added ~19 pre-aggregated, read-only report functions: `services/finance/reports.ts` (monthly P&L, client profitability, employee-cost, expense breakdown, subscription run-rate, remittance, FY comparison) and `services/property/reports.ts` (multi-month financials, expense breakdown, payee spend, collection-by-method, service revenue, rent roll, arrears, advance liability, occupancy, lease expiry, scheduled rent changes, tenant statement) + a cross-domain combined-income summary composed in the tool handler. New shared `services/_shared/dateRange.ts` resolves relative `period` tokens (last_3_months / this_year / this_fiscal_year / …) or explicit from/to **server-side** (the model is told today's date). All wired into `services/ai/tools.ts` (31 read tools total) and documented in AI_TOOLS_REFERENCE §3. tsc + eslint + build clean; runtime-smoked all reports against real DB (FY resolution, property month/year range filtering, arrears math, running-balance statement, cross-domain composition).                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-15 | **AI chat session history (two-table)** — new `ChatSession` + `ChatMessage` models (+ `ChatRole` enum) + migration. `services/ai/sessions.ts` (list/get/create/rename/delete + `appendTurn` with auto-title); routes `/api/admin/ai/sessions` (GET/POST) and `/sessions/[id]` (GET/PATCH/DELETE); `lib/api/ai.ts` extended (+ `apiPatch` in the client). Chat route now persists the user+assistant **text** turn after a clean answer via `sessionId`. AI Assistant page reworked: `ConversationList` panel (new/select/delete), lazy session creation, list refresh per turn. tsc + eslint + build clean; runtime-verified session CRUD over HTTP and `appendTurn` persistence (auto-title, ordering, cascade delete) at the service level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-06-14 | **AI provider seam + tool use (Lesson 1.4)** — new `src/services/ai/` domain: vendor-neutral `AiProvider` interface, `adapters/anthropic.ts` (streaming tool-use loop), `registry.ts` (resolves active provider), `config.ts` (provider catalog + masked list/upsert/activate/test), `crypto.ts` (AES-256-GCM key encryption), `tools.ts` (12 read-only finance/property tools). New `AiProviderConfig` model + migration. Rewrote `api/admin/ai/route.ts` to stream through the active provider as plain-text deltas; added `api/admin/ai/config` (GET/PUT) + `config/test` (POST), client layer `lib/api/ai.ts`, and the `/admin/settings/ai` UI (per-provider card, write-only key field, Test connection). Claude-only adapter today; OpenAI/Gemini seeded inactive (`supported:false`). Dropped deprecated `claude-sonnet-4-20250514` → `claude-sonnet-4-6`. New env `AI_CONFIG_SECRET`. tsc + eslint + build clean; authenticated runtime smoke verified config CRUD, key bootstrap+encryption (no leak), and the full decrypt→stream→tool-loop path.                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-14 | **Server service backfill (track B)** — moved DB logic out of route handlers into services: `src/services/property/payees.ts` + `serviceTypes.ts` and new `src/services/admin/` (`account.ts` name/password, `siteSettings.ts` upsert). Rewired the payees, service-types, account, and site-settings routes to delegate; added exports to the property barrel. Now only the 4 PDF-rendering routes touch `db` directly (intentional). tsc + eslint + build clean; runtime-verified create/get/deactivate + validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-14 | **Client API layer (Axios)** — installed `axios`; added `src/lib/api/` (`client.ts` with `apiGet/apiPost/apiPut/apiDelete/apiUpload` over a `/api/admin` instance that unwraps `{data,error}` and throws on failure) + per-domain modules `finance.ts`, `property.ts`, `admin.ts`. Migrated all inline `fetch("/api/admin/…")` calls in 21 client components to the typed layer (only the AI streaming endpoint stays on native `fetch`; PDF downloads stay on `window.open`). Audit also found payees/service-types/account/settings routes hit `db` directly (service-layer backfill = future track B). tsc + eslint + build all clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-07 | Portfolio HTML completed (8.5/10), CV PDF + DOCX created, SEO implemented, all reference markdown files created                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-08 | Next.js project scaffolded — App Router, Prisma schema, NextAuth credentials, middleware, admin layout + sidebar, portfolio component stubs, login page, CLAUDE.md + PROJECT_PLANNING.md written                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-06-08 | Local PostgreSQL set up, `.env` + `.env.local` configured, `npx prisma db push` verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-08 | **Portfolio fully ported** — `sass` installed; 13-file SCSS architecture; all 7 portfolio components implemented from `portfolio.html`; Nav + Footer; root layout with full SEO metadata + geo tags + 3× JSON-LD structured data; build passes zero errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-06-08 | **Admin panel v1** — migrated from `/dashboard` to `/admin`; DB-backed auth (bcrypt passwords, seeded admin user); APP_VERSION session invalidation; dark sidebar + header layout; full route set (property/finance/renovation stubs, AI assistant streaming chat, settings, account, login)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-13 | **Financial Tracker round 2** — current-FY defaults on all list pages; dashboard date-range filter (month/3·6mo/1·2yr/FY/all); `Subscription` model + migration with idempotent monthly auto-charge generation, start/stop/resume + per-month history (`/admin/finance/subscriptions`); per-row PDF receipts (salary/income/expense) + dashboard report PDF; themed `ConfirmDialog` replacing `window.confirm`. Build/lint/tsc + HTTP smoke tests pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-13 | **Financial Tracker module** — ported `Financial Tracker.xlsx` (business finance). 6 new Prisma models + migration; removed unused `Income` model; `fiscalYear.ts` helper; exported 212 rows to `prisma/data/financial-tracker.json` + idempotent seeder (all Excel totals reconcile); `src/services/finance/` + 13 API routes; dashboard (P&L/charts/per-employee/remittance) + earnings/salaries/expenses CRUD + settings pages; sidebar "Financial Tracker" sub-nav. Build + lint + typecheck pass; authenticated end-to-end smoke test verified. Tracked in `FINANCIAL_TRACKER.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-09 | **Admin panel v2 — MUI migration** — replaced Tailwind in all admin components with Material UI v9; Materio-inspired dark theme (`adminTheme.ts`); `AdminShell.tsx` provides `AppRouterCacheProvider` + `ThemeProvider` scoped to admin; rebuilt: sidebar (MUI List nav), header (MUI Box + Avatar), overview (animated stat cards, vivid colors), login (MUI TextField + Alert), AI chat (MUI Card + TextField multiline), settings (MUI Switch + TextField), account (MUI profile + password cards)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

---

## What to build next

In priority order:

1. **sitemap.xml + robots.txt** — `src/app/sitemap.ts` and `src/app/robots.ts` using Next.js metadata conventions
2. **Deploy to DigitalOcean** — push all commits → set up droplet → Nginx + SSL + PM2
3. ~~**Lesson 1.4 — tool use**~~ ✅ done — see AI Assistant module (`services/ai/tools.ts` + Anthropic adapter tool loop). Future: OpenAI + Gemini adapters (`services/ai/adapters/`), write/action tools behind a confirmation step.
4. **Property module** — units list, tenant details, payment tracker (mark PAID/PARTIAL/OVERDUE), due tracker
5. ~~**Finance module**~~ ✅ done — see Financial Tracker (`FINANCIAL_TRACKER.md`)
6. **Renovation module** — line items from spreadsheet data, totals by category
