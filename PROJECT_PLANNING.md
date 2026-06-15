# PROJECT_PLANNING.md — sshakil.com

**Owner:** Syful Islam Shakil  
**Domain:** sshakil.com  
**Repo:** https://github.com/invshakil/personalized-ai-assistant-with-portfolio  
**Last updated:** 2026-06-09

> This is the living project document. Update the **Progress** section as you implement features.
> Claude Code should read this at the start of every session.

---

## Project overview

A single Next.js application serving two purposes:

1. **Public portfolio** at `/` — Syful's work, experience, skills, and contact info for clients and employers.
2. **Private admin panel** at `/admin` — property management, finance tracking, renovation tracking, and an AI assistant powered by Claude.

---

## Architecture decisions

| Decision          | Choice                               | Reason                                                                                   |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Framework         | Next.js 16 App Router                | SSR for portfolio SEO; server components reduce client JS                                |
| Auth              | NextAuth v5 credentials              | Single admin user — no need for OAuth complexity                                         |
| Database          | PostgreSQL + Prisma 5                | Relational data (units→tenants→payments); Prisma gives type safety                       |
| Portfolio styling | SCSS modules + Tailwind CSS v4       | SCSS for variables, mixins, section partials; Tailwind for utility classes               |
| Admin styling     | Material UI v9 + emotion             | Professional dark dashboard UI; scoped to `/admin` — no conflict with portfolio Tailwind |
| AI                | Provider seam (Claude adapter today)  | Vendor-neutral `AiProvider` interface; provider/model/key chosen in Settings → AI, key encrypted in DB. OpenAI/Gemini = future adapter files. |
| Hosting           | DigitalOcean Basic droplet (~$12/mo) | Full control, PM2 + Nginx + Certbot for SSL                                              |
| Session           | JWT (not DB sessions)                | Simpler for single-user setup; no session table needed                                   |

### Styling isolation

The two styling systems are strictly separated by surface — they do not mix:

- **Portfolio** (`/`, `/about`, etc.) — Tailwind v4 utility classes + SCSS partials. CSS tokens in `globals.css`.
- **Admin** (`/admin/*`) — MUI v9 components with `sx` prop. All colors from `adminTheme.ts`. MUI is loaded via `AdminShell.tsx` which provides `ThemeProvider` + `CssBaseline` scoped to the admin layout.
- **Login** (`/admin/login`) — Outside the `(admin)` route group (no sidebar). Has its own inline `ThemeProvider` in `LoginPage.tsx`.

---

## Database schema summary

Defined in `prisma/schema.prisma`. Do not modify schema without updating this document.

| Model                                     | Purpose                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`                                    | NextAuth user (single admin); has `password` (bcrypt hash)                                                                                             |
| `Account`, `Session`, `VerificationToken` | NextAuth internals                                                                                                                                     |
| `SiteSettings`                            | Singleton — admin-editable portfolio content (availability, bio, CV URL)                                                                               |
| `Unit`                                    | 13 flats (Flat 1A–5A); `unitNumber String`, `floor String`, `monthlyRent Decimal`                                                                      |
| `Tenant`                                  | Nullable `unitId` (external members); `tenantCode T01-T07`; `advanceAmount Decimal`; `isExternal`                                                      |
| `Payment`                                 | `rentDue`, `amountPaid`, `advanceApplied`; unique `[tenantId, month, year]`; `receiptNumber`                                                           |
| `PaymentTransaction`                      | Audit log per transaction — `TransactionType` enum (CASH/BANK_TRANSFER/ADVANCE_APPLIED/…)                                                              |
| `AddOnService`                            | Service catalog (WiFi, Parking, Generator…)                                                                                                            |
| `TenantService`                           | Per-tenant service fee (same service can cost different amounts per tenant); `@@unique[tenantId, serviceId]`                                           |
| `RentChange`                              | Scheduled rent increases — `effectiveDate`, `appliedAt` (null = pending, set by payment generation)                                                    |
| `Expense`                                 | Maintenance, utility, salary, subscription expenses; `expenseDate`, `paidTo`, `paymentMode`                                                            |
| `RenovationItem`                          | Construction cost line items with category, amount, vendor, status                                                                                     |
| `Employee`                                | Financial Tracker — business employees (config); `name` unique, `isActive`                                                                             |
| `IncomeSource`                            | Financial Tracker — client/income source config (MapX, DevArena+DevCourt…); `name` unique                                                              |
| `BizExpenseCategory`                      | Financial Tracker — tool/subscription expense category config; `name` unique                                                                           |
| `Earning`                                 | Financial Tracker — client income; `sourceId`, `remittance` (REM/NON_REM), `amount`, `fiscalYear`                                                      |
| `EmployeePayment`                         | Financial Tracker — salary payments; `employeeId`, `type`, `amount`, `fiscalYear`, `reference` (note); m2m `clients`→`IncomeSource` (`PaymentClients`) |
| `BizExpense`                              | Financial Tracker — business expenses; `categoryId`, `isRecurring`, `amount`, `fiscalYear`, `subscriptionId?`                                          |
| `Subscription`                            | Financial Tracker — recurring service; `monthlyAmount`, `startDate`, `endDate?`; auto-generates monthly `BizExpense` charges                           |
| `AiProviderConfig`                        | AI provider seam — one row per provider (anthropic/openai/google); `defaultModel`, `isActive` (one at a time), `enabled`, optional `baseUrl`; API key AES-256-GCM encrypted (`apiKeyEnc`/`apiKeyIv`/`apiKeyTag`) |

Currency: **BDT (Bangladeshi Taka ৳)** throughout. All `Decimal` fields are BDT unless noted.

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
│   │   │   ├── layout.tsx         ✅ server component — auth check, passes session to AdminShell
│   │   │   ├── AdminShell.tsx     ✅ "use client" — AppRouterCacheProvider + ThemeProvider + flex layout
│   │   │   └── admin/
│   │   │       ├── page.tsx           ✅ /admin — imports OverviewPage
│   │   │       ├── OverviewPage.tsx   ✅ MUI stats cards (animated), quick access, module status, system, checklist
│   │   │       ├── property/
│   │   │       │   ├── page.tsx       ✅ stub
│   │   │       │   └── PropertyPage.tsx ✅ MUI StubPage
│   │   │       ├── finance/
│   │   │       │   ├── page.tsx       ✅ stub
│   │   │       │   └── FinancePage.tsx ✅ MUI StubPage
│   │   │       ├── renovation/
│   │   │       │   ├── page.tsx       ✅ stub
│   │   │       │   └── RenovationPage.tsx ✅ MUI StubPage
│   │   │       ├── ai-assistant/
│   │   │       │   ├── page.tsx           ✅
│   │   │       │   ├── AiAssistantPage.tsx ✅ MUI chat UI — streaming responses functional
│   │   │       │   ├── types.ts           ✅ Message, ChatState
│   │   │       │   └── ai-assistant.module.scss  (legacy — no longer used)
│   │   │       ├── settings/
│   │   │       │   ├── page.tsx           ✅ server — loads SiteSettings from DB
│   │   │       │   ├── SettingsPage.tsx   ✅ MUI form — TextField, Switch, Card, Button
│   │   │       │   └── types.ts           ✅ SettingsFormData
│   │   │       └── account/
│   │   │           ├── page.tsx           ✅ server — loads user from DB
│   │   │           ├── AccountPage.tsx    ✅ MUI form — profile + password sections
│   │   │           └── types.ts           ✅ ProfileFormData, PasswordFormData
│   │   ├── admin/                 ← NOT inside (admin) group — no sidebar, no auth layout
│   │   │   └── login/
│   │   │       ├── page.tsx       ✅
│   │   │       └── LoginPage.tsx  ✅ MUI form with inline ThemeProvider + CssBaseline
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  ✅ complete
│   │   │   └── admin/
│   │   │       ├── ai/route.ts        ✅ streaming Claude Sonnet 4 response
│   │   │       ├── settings/route.ts  ✅ PUT — upserts SiteSettings singleton
│   │   │       └── account/route.ts   ✅ PUT — update name or password (bcrypt)
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
│   │   │   ├── AdminSidebar.tsx   ✅ MUI List nav, sticky, <Box role="navigation">
│   │   │   ├── AdminHeader.tsx    ✅ MUI Box header — breadcrumb + user avatar/tooltip
│   │   │   ├── AdminBreadcrumb.tsx ✅ MUI Typography breadcrumb
│   │   │   ├── PageHeader.tsx     ✅ MUI Typography h5 + subtitle
│   │   │   ├── StatCard.tsx       (legacy — stats now inline in OverviewPage)
│   │   │   ├── StubPage.tsx       ✅ MUI Card "Coming soon" — used by property/finance/renovation
│   │   │   ├── ChatMessage.tsx    ✅ MUI Avatar + Box chat bubble
│   │   │   └── FormField.tsx      ✅ MUI Typography label wrapper
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
│   ├── lib/
│   │   ├── auth.ts                ✅ NextAuth config — bcrypt verify, APP_VERSION invalidation
│   │   ├── db.ts                  ✅ Prisma singleton
│   │   └── adminTheme.ts          ✅ MUI dark theme (Materio-inspired palette)
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
- `/admin/property/dashboard` — Financial dashboard (bar + line charts, occupancy, due tracker)

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

- `/admin/finance` — dashboard: per-FY P&L (income, emp costs, tools, net profit, margin), monthly
  income trend + income-by-client charts, per-employee×FY salary matrix, remittance split
- `/admin/finance/earnings` — client income log (REM/Non-rem), FY filter, add/edit drawer
- `/admin/finance/payments` — employee salary payments, employee + FY filters; each salary links to
  one or more **clients** (multi-select from the unified client list) + an optional note
- `/admin/finance/expenses` — one-off business expenses; subscription-generated charges shown read-only
- `/admin/finance/subscriptions` — recurring services: start, **stop from a month**, resume, per-month
  spend history, Active/Ended status; each active month auto-generates one expense charge (idempotent)
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

### 3. Renovation Tracker (`/admin/renovation`)

- Line items from `House_Rebuilding_Construction.xlsx`
- Grand total: ৳12,500,000
- Categories: Materials, Constructor, Services, Other Costs

### 4. AI Assistant (`/admin/ai-assistant`) ✅ functional — provider-swappable + tool use

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
- **Model:** current model IDs (`claude-sonnet-4-6` default; `claude-opus-4-8`, `claude-haiku-4-5`
  selectable). The old `claude-sonnet-4-20250514` was dropped — it is deprecated (retires 2026-06-15).
- Streaming contract: the route emits **plain UTF-8 text deltas** (matching the existing client);
  errors are surfaced inline as `⚠️ …`. Tool-call events are not written to the text stream.

### 4a. AI Settings (`/admin/settings/ai`) ✅ functional

- One card per provider: model dropdown, **write-only** API key field (shows "Key set", never the
  secret), optional base URL, enabled switch, **Save**, **Save & set active**, **Test connection**.
- API keys are **AES-256-GCM encrypted at rest** (`services/ai/crypto.ts`, key from
  `AI_CONFIG_SECRET`); the plaintext is never persisted or returned. On first run the Claude key is
  bootstrapped from the legacy `ANTHROPIC_API_KEY` env so existing installs keep working.
- API: `GET/PUT /api/admin/ai/config`, `POST /api/admin/ai/config/test`. Client layer:
  `src/lib/api/ai.ts`. Services: `src/services/ai/config.ts` (list/upsert/activate/test).

### 5. Settings (`/admin/settings`) ✅ functional

- Toggle availability for work (MUI Switch)
- Edit hero tagline, bio, meta description, CV URL (MUI TextField)
- Save updates `SiteSettings` singleton in DB — changes reflect live on the public portfolio

### 6. Account (`/admin/account`) ✅ functional

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

| Date       | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-14 | **AI provider seam + tool use (Lesson 1.4)** — new `src/services/ai/` domain: vendor-neutral `AiProvider` interface, `adapters/anthropic.ts` (streaming tool-use loop), `registry.ts` (resolves active provider), `config.ts` (provider catalog + masked list/upsert/activate/test), `crypto.ts` (AES-256-GCM key encryption), `tools.ts` (12 read-only finance/property tools). New `AiProviderConfig` model + migration. Rewrote `api/admin/ai/route.ts` to stream through the active provider as plain-text deltas; added `api/admin/ai/config` (GET/PUT) + `config/test` (POST), client layer `lib/api/ai.ts`, and the `/admin/settings/ai` UI (per-provider card, write-only key field, Test connection). Claude-only adapter today; OpenAI/Gemini seeded inactive (`supported:false`). Dropped deprecated `claude-sonnet-4-20250514` → `claude-sonnet-4-6`. New env `AI_CONFIG_SECRET`. tsc + eslint + build clean; authenticated runtime smoke verified config CRUD, key bootstrap+encryption (no leak), and the full decrypt→stream→tool-loop path. |
| 2026-06-14 | **Server service backfill (track B)** — moved DB logic out of route handlers into services: `src/services/property/payees.ts` + `serviceTypes.ts` and new `src/services/admin/` (`account.ts` name/password, `siteSettings.ts` upsert). Rewired the payees, service-types, account, and site-settings routes to delegate; added exports to the property barrel. Now only the 4 PDF-rendering routes touch `db` directly (intentional). tsc + eslint + build clean; runtime-verified create/get/deactivate + validation.                                                                                                                   |
| 2026-06-14 | **Client API layer (Axios)** — installed `axios`; added `src/lib/api/` (`client.ts` with `apiGet/apiPost/apiPut/apiDelete/apiUpload` over a `/api/admin` instance that unwraps `{data,error}` and throws on failure) + per-domain modules `finance.ts`, `property.ts`, `admin.ts`. Migrated all inline `fetch("/api/admin/…")` calls in 21 client components to the typed layer (only the AI streaming endpoint stays on native `fetch`; PDF downloads stay on `window.open`). Audit also found payees/service-types/account/settings routes hit `db` directly (service-layer backfill = future track B). tsc + eslint + build all clean. |
| 2026-06-07 | Portfolio HTML completed (8.5/10), CV PDF + DOCX created, SEO implemented, all reference markdown files created                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-08 | Next.js project scaffolded — App Router, Prisma schema, NextAuth credentials, middleware, admin layout + sidebar, portfolio component stubs, login page, CLAUDE.md + PROJECT_PLANNING.md written                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-06-08 | Local PostgreSQL set up, `.env` + `.env.local` configured, `npx prisma db push` verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-08 | **Portfolio fully ported** — `sass` installed; 13-file SCSS architecture; all 7 portfolio components implemented from `portfolio.html`; Nav + Footer; root layout with full SEO metadata + geo tags + 3× JSON-LD structured data; build passes zero errors                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-08 | **Admin panel v1** — migrated from `/dashboard` to `/admin`; DB-backed auth (bcrypt passwords, seeded admin user); APP_VERSION session invalidation; dark sidebar + header layout; full route set (property/finance/renovation stubs, AI assistant streaming chat, settings, account, login)                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-13 | **Financial Tracker round 2** — current-FY defaults on all list pages; dashboard date-range filter (month/3·6mo/1·2yr/FY/all); `Subscription` model + migration with idempotent monthly auto-charge generation, start/stop/resume + per-month history (`/admin/finance/subscriptions`); per-row PDF receipts (salary/income/expense) + dashboard report PDF; themed `ConfirmDialog` replacing `window.confirm`. Build/lint/tsc + HTTP smoke tests pass.                                                                                                                                                                                   |
| 2026-06-13 | **Financial Tracker module** — ported `Financial Tracker.xlsx` (business finance). 6 new Prisma models + migration; removed unused `Income` model; `fiscalYear.ts` helper; exported 212 rows to `prisma/data/financial-tracker.json` + idempotent seeder (all Excel totals reconcile); `src/services/finance/` + 13 API routes; dashboard (P&L/charts/per-employee/remittance) + earnings/salaries/expenses CRUD + settings pages; sidebar "Financial Tracker" sub-nav. Build + lint + typecheck pass; authenticated end-to-end smoke test verified. Tracked in `FINANCIAL_TRACKER.md`.                                                   |
| 2026-06-09 | **Admin panel v2 — MUI migration** — replaced Tailwind in all admin components with Material UI v9; Materio-inspired dark theme (`adminTheme.ts`); `AdminShell.tsx` provides `AppRouterCacheProvider` + `ThemeProvider` scoped to admin; rebuilt: sidebar (MUI List nav), header (MUI Box + Avatar), overview (animated stat cards, vivid colors), login (MUI TextField + Alert), AI chat (MUI Card + TextField multiline), settings (MUI Switch + TextField), account (MUI profile + password cards)                                                                                                                                     |

---

## What to build next

In priority order:

1. **sitemap.xml + robots.txt** — `src/app/sitemap.ts` and `src/app/robots.ts` using Next.js metadata conventions
2. **Deploy to DigitalOcean** — push all commits → set up droplet → Nginx + SSL + PM2
3. ~~**Lesson 1.4 — tool use**~~ ✅ done — see AI Assistant module (`services/ai/tools.ts` + Anthropic adapter tool loop). Future: OpenAI + Gemini adapters (`services/ai/adapters/`), write/action tools behind a confirmation step.
4. **Property module** — units list, tenant details, payment tracker (mark PAID/PARTIAL/OVERDUE), due tracker
5. ~~**Finance module**~~ ✅ done — see Financial Tracker (`FINANCIAL_TRACKER.md`)
6. **Renovation module** — line items from spreadsheet data, totals by category
