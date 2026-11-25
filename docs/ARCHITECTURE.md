# Architecture

How sshakil.com is built today. This is project knowledge, not rules: the rules are in [AGENTS.md](../AGENTS.md) and [CODING_STANDARDS.md](CODING_STANDARDS.md). What is built and what is open is in [STATUS.md](STATUS.md). Why things are the way they are is in [decisions/](decisions/).

## What the project is

One Next.js application for the owner's personal domain, with two surfaces:

| Route           | Audience                                | Auth     |
| --------------- | --------------------------------------- | -------- |
| `/`             | Public: portfolio website, booking form | None     |
| `/trips/<slug>` | Public: a published trip cost guide     | None     |
| `/admin/*`      | Private: the owner's admin dashboard    | Required |
| `/admin/login`  | Login page                              | None     |

The admin covers property management, business finance, personal money, trips, bookings, solar monitoring, reports, an AI assistant, and settings. There is a single admin user.

## Stack

- **Next.js 16**, App Router, TypeScript, `src/` directory. The build runs with `next build --webpack`. This version differs from older Next.js: the request interceptor is `src/proxy.ts`, not `middleware.ts`. The guides are in `node_modules/next/dist/docs/`.
- **React 19**.
- **Tailwind CSS v4 + SCSS** on the portfolio surface.
- **Material UI v9 + emotion** on the admin surface.
- **Prisma 5 + PostgreSQL**.
- **NextAuth v5 beta**, credentials provider, JWT sessions.
- **Redux Toolkit** for transient admin client state (one slice today: `aiChatSlice`).
- **Axios** for the admin client API layer.
- **`@react-pdf/renderer`** for PDF receipts, reports and exports.
- **AI provider seam** (`src/services/ai/`), with a Claude adapter (`@anthropic-ai/sdk`).
- **Tests:** `node:test` through `tsx` (`npm run test`). There is no Jest or Vitest.
- **Hosting:** one DigitalOcean droplet with Nginx, PM2 and a local PostgreSQL.

## The two styling surfaces

The two styling systems do not mix. The rule is in AGENTS.md; this is how it is set up.

| Surface   | Styling            | Entry point                                                     |
| --------- | ------------------ | --------------------------------------------------------------- |
| Portfolio | Tailwind v4 + SCSS | `src/styles/tailwind.css`, `src/styles/globals.scss`            |
| Admin     | MUI v9 + emotion   | `src/lib/adminTheme.ts`, `src/app/(admin)/AdminShell.tsx`       |
| Login     | MUI v9             | `src/app/admin/login/LoginPage.tsx`, with its own ThemeProvider |

- The root layout (`src/app/layout.tsx`) imports Tailwind and the SCSS, and sets fonts and SEO metadata.
- MUI is loaded only by `AdminShell.tsx`, which provides `AppRouterCacheProvider`, the theme and `CssBaseline` for the admin layout.
- The login page sits outside the `(admin)` route group, so it has no sidebar and no session. It uses the default theme (`adminTheme`).
- The portfolio SCSS has a global `nav { position: fixed }` rule (`src/styles/_nav.scss`). It reaches into the admin, which is why the admin sidebar uses `<Box role="navigation">`.
- The public booking form and the public trip page are portfolio surface, so they use Tailwind and SCSS (`_booking.scss`, `_trip.scss`).

### Portfolio design tokens

Defined as CSS variables in `src/styles/_base.scss` (SCSS sources in `_variables.scss`).

| Token                  | Value                       | Use                               |
| ---------------------- | --------------------------- | --------------------------------- |
| `--color-linen`        | `#f5f0e8`                   | Hero background                   |
| `--color-sage`         | `#8faa8b`                   | Sage green accent                 |
| `--color-sage-light`   | `#e8f0e7`                   | Skills section background         |
| `--color-sage-dark`    | `#2d5a27`                   | Dark sage text and borders        |
| `--color-slate`        | `#3d5a80`                   | Experience section accent         |
| `--color-slate-light`  | `#e8eef5`                   | Experience section background     |
| `--color-purple`       | `#6b4d8f`                   | Projects section accent           |
| `--color-purple-light` | `#f0eaf8`                   | Projects section background       |
| `--color-forest`       | `#1a3a2a`                   | Contact section background        |
| `--color-forest-light` | `#2d5a3d`                   | Contact section secondary         |
| `--px`                 | `clamp(1.25rem, 5vw, 5rem)` | Horizontal padding, every section |

### Admin theme tokens

The admin theme is built from settings, not a static object. `createAdminTheme(settings, resolvedMode)` in `src/lib/adminTheme.ts` reads the `AdminThemeSettings` singleton: mode (light, dark, system), primary colour, card shadow and border, border radius, density and font size. The `(admin)` layout loads the singleton on the server with `getThemeSettings()` and passes it down, so there is no flash. Live preference state lives in `components/admin/AdminThemeProvider.tsx`. The owner edits it at `/admin/settings/appearance`.

Dark defaults (light mode supplies its own paper, text and divider values under the same keys):

| Token                | Dark default | Use                                                          |
| -------------------- | ------------ | ------------------------------------------------------------ |
| `background.default` | `#25293c`    | Page background                                              |
| `background.paper`   | `#2f3349`    | Cards, sidebar, header                                       |
| `primary.main`       | `#7367f0`    | Accent. User-configurable; light and dark shades are derived |
| `success.main`       | `#28c76f`    | Active and OK badges                                         |
| `warning.main`       | `#ff9f43`    | Warnings                                                     |
| `error.main`         | `#ea5455`    | Errors, overdue                                              |
| `info.main`          | `#00cfe8`    | Info                                                         |
| `text.primary`       | `#cfd3ec`    | Main text                                                    |
| `text.secondary`     | `#8692a8`    | Muted text, labels                                           |
| `divider`            | rgba         | Borders between sections                                     |

## Folder structure

```
prisma/
  schema.prisma            single source of truth for the database
  migrations/              36 migrations
  seed.ts                  upserts the admin user (runs on every deploy)
  seed-financial.ts, seed-money.ts, seed-solar.ts, data/
scripts/                   money.ts (CLI), db-restore.ts, apply-migration.ts, solis-test.ts,
                           eval-categorize.ts, backfill-trip-groups.ts
src/
  proxy.ts                 protects /admin/* and re-issues the session cookie
  instrumentation.ts       starts the in-process schedulers when the server boots
  app/
    layout.tsx             root layout: fonts, SEO metadata, Tailwind + SCSS
    page.tsx               re-exports the portfolio page
    sitemap.ts, robots.ts, opengraph-image.tsx
    (portfolio)/           public pages: layout (Nav, Footer, JSON-LD), page, trips/[slug]
    (admin)/               auth-gated group
      layout.tsx           server component: auth check, loads theme settings
      AdminShell.tsx       client: cache provider, theme, store, form defaults, flex layout
      admin/               one folder per admin module (see "Admin modules")
    admin/login/           login page, outside the (admin) group
    api/
      auth/[...nextauth]/  NextAuth
      admin/               session-guarded route handlers (139 route files in total under api/)
      booking/             public booking routes: config, slots, create, cancel
  components/
    portfolio/             Hero, Skills, Experience (+ experience/), Projects, Testimonials,
                           BookConsultation, FloatingBookButton, Contact, ScrollAnimator
    admin/                 shared admin components (MUI)
    shared/                Nav, Footer, Logo
  services/                server services: business logic + Prisma
    admin/                 account, siteSettings, businessProfile, themeSettings, overview,
                           formDefaults, backup, backupScheduler, googleDrive, logs, logRetention
    property/              units, tenants, payments, paymentGeneration, transactions, expenses,
                           addOnServices, serviceTypes, payees, rentChanges, oneOffCharges,
                           vouchers, documents, propertySettings, dashboard, reports
    finance/               earnings, conversion, conversionPlan, _realized, payments, bizExpenses,
                           subscriptions, config, dashboard, reports, exports, pdfKit
    money/                 accounts, accountTypes, entries, entryQuery, beneficiaries, categories,
                           categorize, import, link, ledgerExport, dashboard, reports
    trips/                 trips, participants, expenses, settlements, fund, report, public, _split
    booking/               settings, slots, bookings, googleCalendar
    solar/                 tariff, reports, weather, settings
    solis/                 client (read-only), fieldMap, sync, scheduler
    ai/                    types, registry, adapters/anthropic, config, crypto, tools, writeTools/,
                           task, sessions, usage, pricing, proposedActions, uploads
    _shared/               dateRange, fx, csv, listQuery
  lib/
    auth.ts                NextAuth config
    db.ts                  Prisma singleton
    adminTheme.ts          createAdminTheme factory
    adminRouting.ts        pure routing decision used by proxy.ts
    apiRoute.ts            withApiError wrapper for route handlers
    api/                   client API layer (Axios): client, admin, ai, booking, currencies,
                           finance, money, property, solar, trips
    accountPicker.ts, numberField.ts, calcExpression.ts, formDefaults/, fiscalYear.ts,
    logger.ts, logSanitize.ts, loginRateLimit.ts, callbackUrl.ts, aiCredit.ts
  hooks/                   shared hooks: useConfirmDialog, useCurrencyOptions, useFormDefaults,
                           useMoneyAccounts, useSpeechRecognition
  store/                   Redux Toolkit: store.ts, hooks.ts, StoreProvider.tsx, slices/aiChatSlice.ts
  styles/                  SCSS partials, globals.scss, tailwind.css
  types/                   per-module types (admin, booking, finance, formDefaults, fx, money,
                           portfolio, property, solar, trip) + index.ts barrel
```

Feature pages follow the orchestrator + hooks + components layout described in CODING_STANDARDS.md. The reference implementation is `src/app/(admin)/admin/ai-assistant/`.

## Admin layout

```
(admin)/layout.tsx        server component; auth check; loads theme settings; passes session to AdminShell
(admin)/AdminShell.tsx    "use client"; AppRouterCacheProvider + AdminThemeProvider + StoreProvider
                          + FormDefaultsProvider + CssBaseline + flex layout
components/admin/
  AdminSidebar.tsx        MUI List nav with collapsible groups; <Box role="navigation">
  AdminHeader.tsx         breadcrumb + light/dark toggle + user avatar
  AdminBreadcrumb.tsx     MUI Typography breadcrumb
  AdminThemeProvider.tsx  theme context: live preview and persistence
  FormDefaultsProvider.tsx loads stored form defaults once
  PageHeader.tsx          h5 title + subtitle
  StubPage.tsx            "Coming soon" card for unbuilt modules
```

Shared admin components used across features: `SearchableSelect`, `MultiSearchableSelect`, `CurrencySelect`, `CurrencyMultiSelect`, `AccountTypeAccountSelect`, `NumberField`, `EntityLink`, `ConfirmDialog`, `ExportMenuButton`, `PendingActionCard`, `ChatMessage`, `Markdown`, `PayeeDocuments`, `TenantDocuments`. `StatCard` and `FormField` are legacy helpers.

The sidebar has no top-level Reports item. Property, Financial Tracker and Solar each carry their own Reports child.

## Authentication and sessions

- NextAuth v5 credentials provider, configured in `src/lib/auth.ts`. Passwords are bcrypt hashes on the `User` row. The admin user is created by `prisma/seed.ts` from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Sessions are JWTs, not database sessions.
- **Sliding 24-hour session.** `session.maxAge` is 24 hours. `src/proxy.ts` matches `/admin/:path*` and `/api/admin/:path*`, and calling `auth()` there re-signs the token on every admin page or API request. Only 24 hours with no admin traffic ends the session. The routing decision is the pure function `resolveAdminAccess` in `src/lib/adminRouting.ts`.
- The proxy redirects an unauthenticated page request to `/admin/login` with a `callbackUrl`. API handlers are not redirected: each one checks the session and answers 401.
- Changing `APP_VERSION` in the environment forces every session to sign in again.
- Failed logins are rate-limited (`src/lib/loginRateLimit.ts`) and logged.

## Data flow

```
client component -> src/lib/api/<domain>.ts (Axios, baseURL /api/admin)
                          |
            src/app/api/admin/**/route.ts   (thin: session check, input validation)
                          |
            src/services/<domain>/*.ts      (business logic + Prisma via src/lib/db.ts)
                          |
                      PostgreSQL
```

- **API routes** return `{ data, error }` JSON. Mutating handlers are wrapped in `withApiError` (`src/lib/apiRoute.ts`), which turns a thrown error into that shape and logs unhandled 5xx and Prisma errors.
- **Server services** hold the business logic. The same functions back the API routes, the AI tools, the `scripts/money.ts` CLI and the public pages. They return JSON-safe data through each domain's `_serializers.ts`.
- **Client API layer.** `src/lib/api/client.ts` exposes `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, `apiUpload` and `downloadUrl`. It unwraps `{ data, error }` and throws `Error(error)` on failure. Two things stay on native browser APIs: PDF downloads (`window.open`) and the AI streaming endpoint (`fetch` + `ReadableStream`).
- **Direct `db` access in routes** is limited to the PDF-rendering routes.
- **Public routes** (`/api/booking/*`) have no session. They validate, cap and rate-limit in the service.

Conventions for a service file are written up, with Property as the example, in [SERVICE_LAYER.md](SERVICE_LAYER.md).

## Background jobs

`src/instrumentation.ts` runs once when the Node.js server boots. It sets the server time zone to `Asia/Dhaka` unless `TZ` is set, and starts three in-process schedulers:

- **Backup scheduler** (`services/admin/backupScheduler.ts`): a 30-minute tick that runs a backup when one is due.
- **Solis scheduler** (`services/solis/scheduler.ts`): about every two hours, refreshes today and backfills missing days.
- **Log retention** (`services/admin/logRetention.ts`): every six hours, deletes log rows older than `LOG_RETENTION_DAYS`.

## Database

Defined in `prisma/schema.prisma`: 63 models and 22 enums. BDT is the canonical reporting currency. Every `Decimal` money field is BDT unless noted.

### Auth, site and admin settings

| Model                                     | Purpose                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `User`                                    | The single admin user; `password` is a bcrypt hash                                                    |
| `Account`, `Session`, `VerificationToken` | NextAuth internals                                                                                    |
| `SiteSettings`                            | Singleton. Portfolio content the admin can edit: availability, tagline, bio, meta description, CV URL |
| `BusinessProfile`                         | Singleton. Business name, tagline and contact block printed on finance PDFs                           |
| `AdminThemeSettings`                      | Singleton. Admin appearance; drives `createAdminTheme()`                                              |
| `FormDefault`                             | One row per `(scope, field)`: the stored default for a form dropdown; `mode` is `fixed` or `lastUsed` |
| `BackupSettings`                          | Singleton. Backup frequency, retention, last-run status, encrypted Google Drive refresh token         |
| `BackupRecord`                            | One row per backup attempt: file, size, location, trigger, status                                     |
| `LogEntry`                                | Application log: level, source, message, redacted context JSON                                        |

### Property

| Model                    | Purpose                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PropertySettings`       | Singleton. Property and owner details printed on receipts                                                                                       |
| `Unit`                   | A flat: `unitNumber`, `floor`, `monthlyRent`                                                                                                    |
| `Tenant`                 | A tenant, or an external member with no unit (`isExternal`, service-only billing); `tenantCode`, `advanceAmount`                                |
| `Payment`                | One month's bill for a tenant: `rentDue`, `amountPaid`, `advanceApplied`, `receiptNumber`; unique per tenant, month and year                    |
| `PaymentTransaction`     | Audit row per transaction against a payment; `TransactionType` enum                                                                             |
| `AddOnService`           | Service catalog (WiFi, parking, generator and so on)                                                                                            |
| `TenantService`          | Per-tenant fee for a service; the same service can cost different amounts per tenant                                                            |
| `RentChange`             | A scheduled rent change: `effectiveDate`, `appliedAt` (null means pending; set by payment generation)                                           |
| `OneOffCharge`           | A one-time charge on one month's bill; folded into `rentDue`                                                                                    |
| `Voucher`                | A credit against one month's bill; stored positive, subtracted from `rentDue`, capped at the outstanding bill, never carried forward            |
| `Expense`                | Property expense; `accountId` is the Money account it was paid from (the account's type is the payment mode); `paymentMode` is legacy free text |
| `Payee`, `PayeeDocument` | People the property pays (caretaker, electrician) and their uploaded documents                                                                  |
| `TenantDocument`         | Uploaded tenant documents                                                                                                                       |
| `PropertyServiceType`    | Expense service types, each mapped to a coarse `ExpenseCategory`                                                                                |
| `RenovationItem`         | Construction cost line item. No code uses it yet: the Renovation module is a stub                                                               |

### Financial Tracker (business finance)

| Model                                            | Purpose                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Employee`, `IncomeSource`, `BizExpenseCategory` | Config lists: employees, clients, expense categories                                                                                             |
| `Earning`                                        | Client income; remittance type; BDT `amount` plus `currency`, `originalAmount`, `fxRate`; realization fields; exchange-undo fields; `fiscalYear` |
| `EmployeePayment`                                | Salary payment; many-to-many `clients` to `IncomeSource`; multi-currency fields                                                                  |
| `BizExpense`                                     | Business expense; `subscriptionId` when a subscription generated it                                                                              |
| `Subscription`                                   | A recurring service; generates one `BizExpense` per active month                                                                                 |
| `SubscriptionRateChange`                         | Effective-dated price change, applies from `effectiveMonth` onward                                                                               |
| `SubscriptionMonthOverride`                      | Final amount for one month (discount, coupon, free month)                                                                                        |

The fiscal year runs July to June and is stored per row (`src/lib/fiscalYear.ts`). The full design is in [FINANCIAL_TRACKER.md](FINANCIAL_TRACKER.md).

### Money Manager (personal finance)

| Model                                  | Purpose                                                                                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AccountType`                          | User-managed, archivable account type; `kind` (CASH, BANK, MOBILE_WALLET, CREDIT_CARD, OTHER) is fixed at creation                                                                                                                                  |
| `MoneyAccount`                         | An account; `accountTypeId`, `currency`, `openingBalance`, `creditLimit`, `isTypeDefault`. Its balance is derived from the ledger                                                                                                                   |
| `MoneyCategory`                        | Income or expense category; unique on name and kind                                                                                                                                                                                                 |
| `MoneyEntry`                           | The single personal ledger: `direction` CREDIT, DEBIT or TRANSFER; account and transfer account; `toAmount` and `fxRate` for cross-currency transfers; `feeForTransferId` links a fee to its parent entry; `method` (legacy, CREDIT only); `tripId` |
| `Beneficiary`, `BeneficiaryObligation` | People the owner pays, and their recurring allowances or loans                                                                                                                                                                                      |
| `MoneyImportBatch`                     | One CSV import; deleting it rolls back its entries                                                                                                                                                                                                  |
| `FxRate`                               | Cached live BDT rate per foreign currency                                                                                                                                                                                                           |

### Trips

| Model              | Purpose                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `Trip`             | A trip: destination, currencies, dates, status, optional foreign wallet account, public slug      |
| `TripBudget`       | Planned amount per `TripCategory`                                                                 |
| `TripParticipant`  | A person on a trip; exactly one `isSelf`; soft-deleted to keep split history                      |
| `TripExpense`      | A shared cost: payer, split mode, amount in its currency and in BDT, optional linked `MoneyEntry` |
| `TripExpenseShare` | One participant's slice of an expense; shares sum exactly to the expense                          |
| `TripSettlement`   | Money handed between two participants; never posts a `MoneyEntry`                                 |

### Booking

| Model             | Purpose                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `BookingSettings` | Singleton. Enable flag, durations, slot rules, time zone, working hours, WhatsApp block, encrypted Google refresh token |
| `BookingBlackout` | A closed day                                                                                                            |
| `Booking`         | One visitor booking: times, status, Google event id, Meet URL, unguessable cancel token                                 |

### Solar

| Model                             | Purpose                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SolarSettings`                   | Singleton. System size, battery, install cost and date, location, CO2 factor, discovered station id, last-sync status. Credentials are never stored here |
| `ElectricityTariff`, `TariffSlab` | Effective-dated tariff versions and their cumulative consumption bands                                                                                   |
| `SolisDailyReading`               | One row per inverter per day of read-only telemetry                                                                                                      |

### AI

| Model                        | Purpose                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `AiProviderConfig`           | One row per provider: default model, active flag, optional base URL, AES-256-GCM encrypted API key            |
| `ChatSession`, `ChatMessage` | Persisted assistant conversations. Text turns only; tool round-trips are not stored                           |
| `AiUsage`                    | One row per model call: token counts, cost in USD, and the `feature` that spent it                            |
| `AiBudget`                   | Singleton. Monthly USD limit and `enforce` flag; also the prepaid credit record (balance, as-of date, expiry) |
| `AiProposedAction`           | A write the model proposed but has not performed: tool, input, summary, status                                |

## Money rules that cut across modules

### BDT is canonical; foreign amounts ride alongside

- `Earning` and `EmployeePayment` carry `currency`, `originalAmount` and `fxRate`. `amount` stays BDT, computed on the server, so every sum-by-amount report is unchanged.
- A `MoneyAccount` has one currency and its balance is in that currency. A cross-currency transfer stores `toAmount` (destination currency) and `fxRate` on the `MoneyEntry`. The Money dashboard converts to a combined BDT total at the latest rate.
- `src/services/_shared/fx.ts` fetches the live rate from `open.er-api.com` and caches it in `FxRate`. `GET /api/admin/fx-rate` prefills the editable rate on a foreign transaction. The rate used for a transaction is stored on its row; the cache only values current balances.
- Currency pickers are fed by the live FX feed (`GET /api/admin/currencies`), not a hardcoded list. Supported codes are `SUPPORTED_CURRENCIES` in `src/types/fx.ts`.

### Foreign income is counted when converted, not when earned

- A foreign `Earning` is pending (`realizedAt` null, excluded from the BDT profit and loss) until it is converted. A BDT earning is realized on the day it is earned.
- Every earning-income sum goes through `getRealizedEarnings` in `src/services/finance/_realized.ts`, which sums `realizedAmount` by `realizedAt`. `dashboard.ts`, `reports.ts` and `admin/overview.ts` all use it.
- Salary payments are counted at pay date.

### Conversion and exchange

The Earnings Convert drawer calls `convertEarnings` in `src/services/finance/conversion.ts`. The allocation maths is the pure, unit-tested `conversionPlan.ts`.

- **To BDT realizes income.** One cross-currency Money transfer is posted and the BDT received is split back onto each earning.
- **The account's real balance is the only ceiling.** An amount larger than the pending income is allowed. Pending earnings are consumed oldest first and realized for their pro-rata share. The excess moves in the same transfer as a plain currency exchange and is booked as no income.
- **Foreign to foreign is an exchange, not income.** The earnings it covers are re-denominated into the destination currency and stay pending. `Earning.exchangeEntryId` and the `exchangedFrom*` fields keep the original values so it can be undone exactly.
- **`reverseConversion` undoes either kind.** Undoing an exchange is refused while part of it has been converted to BDT. An earning can go through one exchange hop only.
- **Integrity.** Conversions and their undos run in one transaction under a Postgres advisory lock, with the balance check inside it. A ledger transfer that settled earnings cannot be deleted from the Ledger; it is undone from Earnings.
- An exchanged or converted earning's money fields are locked for editing.

### Balances are derived, never stored

An account balance is `openingBalance + credits - debits ± transfers`, computed from `MoneyEntry`. Savings figures come from the same ledger. Property and business income reaches the ledger only when the owner records it into an account (`src/services/money/link.ts`); the Money dashboard shows venture take-home as read-only context and does not add it to income.

### Fees

A fee is a separate expense DEBIT on the same account, linked to its parent entry by `MoneyEntry.feeForTransferId` (the parent is a transfer or a payment). Deleting the parent deletes the fee.

## Portfolio sections

`src/app/(portfolio)/page.tsx` renders, in order:

| Component              | Section ID      | Background              | Content                                                                                                               |
| ---------------------- | --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Hero.tsx`             | `#hero`         | `--color-linen`         | Photo, name, tagline, availability block, stats, three calls to action                                                |
| `Skills.tsx`           | `#skills`       | `--color-sage-light`    | Skill groups with tag pills                                                                                           |
| `Experience.tsx`       | `#experience`   | `--color-slate-light`   | One list, newest first; a company with several roles shows them on a timeline. Data in `experience/experienceData.ts` |
| `Projects.tsx`         | `#projects`     | `--color-purple-light`  | Project cards, private badges, GitHub links                                                                           |
| `Testimonials.tsx`     | `#testimonials` | white                   | Client reviews                                                                                                        |
| `BookConsultation.tsx` | `#booking`      |                         | The booking form; hides itself when booking is not live                                                               |
| `Contact.tsx`          | `#contact`      | `--color-forest` (dark) | Contact links, CV download, education                                                                                 |

`FloatingBookButton.tsx` floats over the page and also hides itself when booking is not live. The layout adds `Nav`, `Footer` and three JSON-LD scripts. Availability, tagline, bio and the CV URL come from `SiteSettings`. Contact details live in the components, not in the docs.

## Admin modules

### Overview (`/admin`)

A live cross-domain snapshot from `getAdminOverview()` (`services/admin/overview.ts`): this-month business and property figures, subscription run-rate, rent due, top dues, AI spend cards and a monthly AI cost chart (`AiSpendPanel`).

### Property (`/admin/property`)

Service folder: `src/services/property/`. API: `/api/admin/property/*`.

- Pages: Units and Tenants (`/admin/property`), tenant profile (`tenants/[id]`), unit page (`units/[id]`), Payments, Expenses, Services, Payees, Service Types, Settings. `/admin/property/dashboard` redirects to `/admin/reports/property`.
- Monthly payments generate on page load. Generation is idempotent and applies pending `RentChange` rows first. `rentDue` is base rent + services + one-off charges + carry-forward, minus vouchers.
- A tenant's advance is a BDT amount that can be applied in part to any month. Editing the advance can post only the difference to a Money account.
- Move-out is two steps: preview the settlement, then confirm.
- Receipts are A4 PDFs with a tenant copy and an owner copy (`GET /api/admin/property/payments/[id]/receipt`), numbered `RCP-YYYY-NNNN`.

### Financial Tracker (`/admin/finance`)

Service folder: `src/services/finance/`. API: `/api/admin/finance/*`. `/admin/finance` redirects to `/admin/finance/earnings`.

- **Earnings:** client income. Filters live in the URL (fiscal year, client, income type, period or date range, search). Export to CSV or PDF of the filtered list (`GET /api/admin/finance/earnings/export`). The Convert drawer.
- **Salaries** (`/admin/finance/payments`): each salary links to one or more clients.
- **Expenses:** one-off business expenses; subscription-generated charges are read-only.
- **Subscriptions:** start, stop from a month, resume. A month's charge is the override, else the latest rate change on or before that month, else the base amount.
- **Settings:** employees, income sources, expense categories. A client and an employee each have a profile page (`clients/[id]`, `employees/[id]`).
- List pages default to the current fiscal year. Each salary, earning and expense has a PDF (`services/finance/pdfKit.tsx`).

### Money Manager (`/admin/money`)

Service folder: `src/services/money/`. API: `/api/admin/money/*`.

- Pages: Overview, Ledger (`entries`), People and Loans, Accounts, Account Types, Categories, Import CSV.
- **Accounts:** cash, bank, mobile wallet, credit card (owed is a negative balance; available credit is the limit plus the balance). The Accounts page has Deposit and Transfer actions and shows exact balances to two decimals.
- **Account types** can be archived. Archiving hides the type and every account under it from all pickers; history is untouched. `isSelectable` in `src/lib/accountPicker.ts` is the test. AI write tools resolve names through `selectableAccountByName`.
- **One account picker:** every form that picks an account uses `AccountTypeAccountSelect`. The type is a filter only and is never stored.
- **Categories** can be merged within the same kind (`POST /api/admin/money/categories/[id]/merge`). A category in use cannot be deleted, only merged.
- **CSV import:** column mapping, preview, duplicate detection, reversible batches, and AI category suggestions (see "Embedded AI").
- **Ledger export:** CSV or PDF of exactly the filtered, sorted list, with per-currency income, expense and net totals (`GET /api/admin/money/entries/export`). The list and export routes share one query parser (`entryQuery.ts`). Shared plumbing is `services/_shared/csv.ts` (formula-injection neutralisation, safe filenames, `no-store`) and `listQuery.ts`. PDFs are capped at 1,000 rows. Export routes refuse cross-site requests.
- The same service functions back the `scripts/money.ts` CLI and the `/money` Claude Code command.

### Trips (`/admin/trips`, public `/trips/<slug>`)

Service folder: `src/services/trips/`. API: `/api/admin/trips/*`.

- A trip has its own split ledger: `TripExpense`, `TripExpenseShare`, `TripSettlement`, `TripParticipant`.
- **Posting rule:** a trip expense posts a linked `MoneyEntry` DEBIT only when the payer is the owner and the funding account is a real spendable account (cash, bank, mobile wallet, other, including the trip wallet). A credit card expense or one paid by someone else lives only in the trip ledger.
- **Splits** are equal or exact. Cents are distributed by largest remainder, so shares always sum to the total.
- **Who owes whom:** per-person paid, spent and net in BDT, and a greedy minimal-transfer settle-up list. Settlements never post to the money accounts.
- **Foreign spending** uses a dedicated wallet account (`Trip.localWalletAccountId`), funded by a cross-currency transfer. The funding transfer is tagged with the trip but is not counted as spend.
- **Report** (`report.ts`): planned against actual per category, group cost against paid-by-me, cash against deferred card, spend by currency and by day, balances and the wallet summary. Actuals use each row's stored rate; wallet leftover uses the live rate.
- **Public page:** `/trips/<slug>` renders an aggregate-only cost guide through `getPublicTripSummary`. It never returns participant names, per-person spend or account fields. An unpublished or unknown slug is a 404. The page revalidates hourly.
- The audit of this module is in [TRIP_MANAGEMENT_AUDIT.md](TRIP_MANAGEMENT_AUDIT.md).

### Bookings (`/admin/bookings`, `/admin/settings/booking`, public form)

Service folder: `src/services/booking/`. Public API: `/api/booking/*`. Admin API: `/api/admin/booking*` and `/api/admin/bookings`.

- A visitor picks a duration, a day and a time slot on the portfolio home page, fills in their details, and gets a Google Calendar event with a Meet link. They can cancel through an unguessable token.
- **Availability** (`slots.ts`): working-hours ranges stepped by the slot increment, filtered by minimum notice and maximum horizon, minus blackout days, existing bookings and Google free/busy, each padded by the buffer. Time-zone safe.
- **`createBooking`** inserts a PENDING row, creates the Calendar event, then flips the row to CONFIRMED. If Google fails it becomes CANCELLED.
- **Anti-abuse:** a honeypot field, a per-IP rate limit, and Cloudflare Turnstile verified on the server (skipped only when the keys are unset).
- **Google** (`googleCalendar.ts`): plain `fetch` against OAuth and the Calendar REST API, no `googleapis` dependency. It uses the same OAuth client as Drive backups, with its own redirect URI. The app reads free/busy and creates or deletes only the events it created.
- The booking module has no AI tools.

### Solar (`/admin/reports/solar`, `/admin/settings/solar`)

Service folders: `src/services/solar/` and `src/services/solis/`. API: `/api/admin/solar/*`.

- **Read-only by design.** The SolisCloud client only pulls telemetry. There are no control or write endpoints. The rule is in AGENTS.md.
- **Ingestion** (`solis/`): a signed (HMAC-SHA1) API client. `fieldMap.ts` is the one place that knows raw Solis field names (`npm run solis:test` checks them). `sync.ts` upserts a day into `SolisDailyReading`, refreshes today on every run, and backfills missing days oldest first in chunks.
- **Tariffs:** effective-dated residential slab rates, billed cumulatively over the month. The maths is `solar/tariff.ts`.
- **Reports** (`solar/reports.ts`): generation, consumption split by source, grid import and export, battery charge and discharge, would-have-cost against actual, savings, self-sufficiency, CO2 avoided, and the payback tracker. Weather and predicted generation come from Open-Meteo (`weather.ts`).
- The Solar Reports page is text-first with range presets; each preset is a real API call.

### Reports (`/admin/reports`)

`/admin/reports` redirects to `/admin/reports/financial`. The hub has three pages: `financial`, `property` and `solar`. Reports are served by each domain's `reports.ts` and `dashboard.ts`.

### AI Assistant (`/admin/ai-assistant`) and AI Settings (`/admin/settings/ai`)

Service folder: `src/services/ai/`. API: `/api/admin/ai/*`.

- **Provider seam.** `AiProvider` (`types.ts`) is vendor-neutral. `registry.ts` resolves the active provider from the database (`getActiveProvider`, `getProviderFor`). Only the Claude adapter exists (`adapters/anthropic.ts`). OpenAI and Gemini are seeded as inactive placeholders.
- **Two entry points.** `streamChat` runs the streaming tool-use loop for the chat. `complete<T>()` is one request with JSON-Schema-constrained output, used by embedded features through `runAiTask` and `tryAiTask` in `task.ts`.
- **Tools.** Read tools are in `tools.ts`; write tools are in `writeTools/` (finance, money, property, solar, shared). There are about 100 in total, roughly half read and half write. Tools call the same service functions as the HTTP API. The model sees one scope at a time (`/property`, `/finance`, `/money`, `/solar`) plus shared tools. The catalog is in [AI_TOOLS_REFERENCE.md](AI_TOOLS_REFERENCE.md).
- **Approval gate.** A write tool does not write. It records an `AiProposedAction`, the page shows a `PendingActionCard`, and the write happens only when the owner approves. A decline is recorded through `POST /api/admin/ai/actions/cancel`.
- **Date ranges** are resolved on the server by `services/_shared/dateRange.ts` from a relative `period` token or explicit `from` and `to`. The system prompt carries today's date.
- **Streaming contract.** The route emits plain UTF-8 text deltas. Errors appear inline. Tool-call events are not written to the text stream.
- **History.** `ChatSession` and `ChatMessage` through `sessions.ts`. A session is created on the first message and titled from it.
- **Cost and budget.** Each call's tokens are priced in USD (`pricing.ts`) into `AiUsage`, tagged with a `feature`. With `AiBudget.enforce` on and month-to-date spend at or over the limit, the chat route returns 402 before streaming. USD is deliberate: it is the provider's billing unit and stays separate from BDT.
- **Prepaid credit.** The provider exposes no balance endpoint, so the owner records the Console balance, the date it was read and the expiry. The app shows the balance minus recorded spend since that date. It is an estimate: only this app's calls are metered.
- **Settings page.** One card per provider: model, a write-only API key field, optional base URL, enabled switch, Test connection. Keys are AES-256-GCM encrypted (`crypto.ts`, key from `AI_CONFIG_SECRET`). The plaintext is never stored or returned.
- **Per-purpose models.** Classify and extract tasks run on the catalog's fast model. Analyse and chat use the model chosen in Settings.

#### Embedded AI

AI inside a feature page is an assist, not a dependency. `tryAiTask` returns `null` instead of throwing, so a failed suggestion means no suggestion. `AiUnavailableError` separates "the assistant is unavailable" from "this task failed".

The one embedded feature today is CSV import categorisation (`services/money/categorize.ts`):

- The model runs in preview only. `commitImport` replays the reviewed map (`mapping.aiCategories`). Precedence is mapped column, then AI suggestion, then the blanket default.
- `reconcileAssignments` (preview) drops invented categories, kind and direction mismatches, lines nobody asked about, and anything under 0.5 confidence. `validateSuggestionRecord` (commit) re-applies the category rules to the map the client sends back.
- `npm run eval:categorize` runs golden cases against the real API and reports precision, coverage and cost.

The roadmap is in [AI_FEATURE_INTEGRATION_PLAN.md](AI_FEATURE_INTEGRATION_PLAN.md).

### Settings (`/admin/settings/*`)

- **Site Settings** (`/admin/settings`): availability, hero tagline, bio, meta description, CV URL. Saves to `SiteSettings` and shows on the public portfolio.
- **Appearance:** see "Admin theme tokens".
- **Form Defaults** (`/admin/settings/defaults`): the stored default for each registered form dropdown. The registry is `src/lib/formDefaults/registry.ts`. A default is `fixed` or `lastUsed`. Defaults apply when a form opens to add, never to edit. A wiring test checks that every registered scope is both seeded and remembered by a form. The design is in [FORM_DEFAULTS_PLAN.md](FORM_DEFAULTS_PLAN.md).
- **Backups** (`/admin/settings/backup`): `pg_dump` custom-format backups with a frequency and a retention count, plus Backup now. A backup is written locally first, then uploaded to Google Drive if connected (`services/admin/googleDrive.ts`, scope `drive.file`). Retention prunes both. Download streams from Drive when the local copy is gone. Restore is guided, not run from the browser: the dialog shows the `pg_restore` command and the safety steps. `npm run db:restore -- <file-or-directory>` does the same from the command line, with a safety backup first.
- **Solar** and **Booking** settings: see those modules.
- **AI:** see above.

### Logs (`/admin/logs`)

`src/lib/logger.ts` (`logger.info`, `warn`, `error`) writes a JSON line to stdout and a `LogEntry` row. It never throws. Secret-looking keys are redacted and the context is capped (`logSanitize.ts`). It is wired into `withApiError`, the schedulers and failed logins. The page has URL-state filters, sortable columns and server pagination.

### Account (`/admin/account`)

Display name and password change.

### Renovation (`/admin/renovation`)

A stub page. See [STATUS.md](STATUS.md).

## Number and account inputs

- Every numeric input in the admin is `components/admin/NumberField.tsx`. It evaluates arithmetic typed into the field and passes the parent a resolved number, or an empty string while the text is mid-expression. The behaviour is in `src/lib/numberField.ts`; the parser is `src/lib/calcExpression.ts`, hand-written, with no `eval`.
- Every account picker is `AccountTypeAccountSelect`. Picking a type lands on that type's default account (`MoneyAccount.isTypeDefault`).

The rules for both are in CODING_STANDARDS.md.

## Environment variables

All values live in `.env.local`, which is not committed. `.env.example` lists every variable. `.env` holds only `DATABASE_URL` for the Prisma CLI.

| Variable                                               | Purpose                                                                                                                                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                         | PostgreSQL connection string                                                                                                                                                                                           |
| `AUTH_SECRET`                                          | NextAuth JWT secret                                                                                                                                                                                                    |
| `AUTH_URL`                                             | App URL for NextAuth callbacks and OAuth redirects                                                                                                                                                                     |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                        | Login for the single admin user, read by the seed                                                                                                                                                                      |
| `APP_VERSION`                                          | Changing it forces every session to sign in again                                                                                                                                                                      |
| `ANTHROPIC_API_KEY`                                    | Bootstraps the Claude provider on first run; after that the key is managed in Settings                                                                                                                                 |
| `AI_CONFIG_SECRET`                                     | AES-256-GCM key that encrypts AI provider keys and the Google refresh tokens at rest                                                                                                                                   |
| `NEXT_PUBLIC_SITE_URL`                                 | Public site URL                                                                                                                                                                                                        |
| `NEXT_PUBLIC_CV_URL`                                   | CV download link                                                                                                                                                                                                       |
| `BACKUP_DIR`                                           | Where backups are written; defaults to `./backups`                                                                                                                                                                     |
| `PG_BIN_DIR`                                           | Folder holding `pg_dump` and `pg_restore` if they are not on PATH                                                                                                                                                      |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | One OAuth client for Drive backups and Booking. It needs the Drive and Calendar APIs and two redirect URIs: `<AUTH_URL>/api/admin/backup/google/callback` and `<AUTH_URL>/api/admin/booking/google/callback`. Optional |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstile keys for the public booking form. Optional; without them the captcha is skipped                                                                                                                   |
| `SOLIS_KEY_ID`, `SOLIS_KEY_SECRET`, `SOLIS_API_URL`    | SolisCloud API credentials and base URL. Never stored in the database                                                                                                                                                  |
| `LOG_RETENTION_DAYS`                                   | Days of `LogEntry` rows to keep; defaults to 30                                                                                                                                                                        |
| `TZ`                                                   | Optional override of the server time zone; defaults to `Asia/Dhaka`                                                                                                                                                    |

## Local development

- `npm run dev` starts the app. `npm run seed` creates the admin user; `seed:financial`, `seed:money` and `seed:solar` load module data.
- `npm run test` runs every `*.test.ts` under `src/` with `node:test`. Some suites are integration tests against the development database; they tag their rows and clean up after themselves. `npm run test:money` and `npm run test:booking` run one suite each.
- The local database has no migration baseline, so `prisma migrate dev` fails there. Apply a new migration locally with `scripts/apply-migration.ts`. Production uses `prisma migrate deploy`.
- `scripts/money.ts` is a command-line front end to the Money services.

## CI and deployment

One workflow, `.github/workflows/deploy.yml`, with two jobs.

**Verify** runs on every pull request into `main` and on every push to `main`: `npm ci`, `npm run lint`, `npm run format:check`, `npx tsc --noEmit`, on Node 22. It needs no secrets. It does not run the tests or the build.

**Deploy** runs only on a push to `main`, after Verify passes. It opens an SSH session to the droplet and runs, in the app's folder:

1. `git pull origin main`, with up to three attempts.
2. A swap check. It only warns: the deploy user has no sudo.
3. `npm ci`
4. `npx prisma generate`
5. `npx prisma migrate deploy`
6. `npm run seed`, which upserts the admin user.
7. `npm run build`
8. `pm2 restart sshakil --update-env`, or `pm2 start` if the process does not exist, then `pm2 save`.

The server's `.env.local` holds every real credential. GitHub holds only the SSH connection details and the deploy path, as repository secrets. Memory limits are set through `NODE_OPTIONS` because the droplet is small.

On the droplet, Nginx proxies the domain to the Next.js process on port 3000, Certbot manages the certificate, PM2 keeps the process running, and PostgreSQL runs locally. The server also needs `pg_dump` and `pg_restore` for backups. One-time server setup (Node 22, Nginx, Certbot, PostgreSQL, PM2, a swap file) is done by hand as root; the swap commands are in the comments of `deploy.yml`.

Local git hooks live in `.githooks/` (`pre-commit`, `pre-push`); `npm install` points git at them.

## Related documents

- [STATUS.md](STATUS.md): what is built, what is open.
- [decisions/](decisions/): one file per decision.
- [CODING_STANDARDS.md](CODING_STANDARDS.md): how to write code here.
- [SERVICE_LAYER.md](SERVICE_LAYER.md): service-layer conventions, with Property as the example.
- [FINANCIAL_TRACKER.md](FINANCIAL_TRACKER.md): Financial Tracker design.
- [AI_TOOLS_REFERENCE.md](AI_TOOLS_REFERENCE.md): AI tool catalog and strategy.
- [AI_FEATURE_INTEGRATION_PLAN.md](AI_FEATURE_INTEGRATION_PLAN.md): embedded AI roadmap.
- [AI_ENGINEERING_LEARNING_PROGRESS.md](AI_ENGINEERING_LEARNING_PROGRESS.md): the owner's AI engineering learning notes.
- [FORM_DEFAULTS_PLAN.md](FORM_DEFAULTS_PLAN.md): form defaults design.
- [TRIP_MANAGEMENT_AUDIT.md](TRIP_MANAGEMENT_AUDIT.md): Trip module audit.
