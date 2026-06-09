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
| AI                | Claude Sonnet 4 via Anthropic API    | Tool use for structured data queries against DB                                          |
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

| Model                                     | Purpose                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `User`                                    | NextAuth user (single admin); has `password` (bcrypt hash)                 |
| `Account`, `Session`, `VerificationToken` | NextAuth internals                                                         |
| `SiteSettings`                            | Singleton — admin-editable portfolio content (availability, bio, CV URL)   |
| `Unit`                | 13 flats (Flat 1A–5A); `unitNumber String`, `floor String`, `monthlyRent Decimal`                  |
| `Tenant`              | Nullable `unitId` (external members); `tenantCode T01-T07`; `advanceAmount Decimal`; `isExternal` |
| `Payment`             | `rentDue`, `amountPaid`, `advanceApplied`; unique `[tenantId, month, year]`; `receiptNumber`        |
| `PaymentTransaction`  | Audit log per transaction — `TransactionType` enum (CASH/BANK_TRANSFER/ADVANCE_APPLIED/…)          |
| `AddOnService`        | Service catalog (WiFi, Parking, Generator…)                                                         |
| `TenantService`       | Per-tenant service fee (same service can cost different amounts per tenant); `@@unique[tenantId, serviceId]` |
| `RentChange`          | Scheduled rent increases — `effectiveDate`, `appliedAt` (null = pending, set by payment generation) |
| `Income`              | Salary, freelance, rental income entries by month/year                                              |
| `Expense`             | Maintenance, utility, salary, subscription expenses; `expenseDate`, `paidTo`, `paymentMode`        |
| `RenovationItem`      | Construction cost line items with category, amount, vendor, status                                  |

Currency: **BDT (Bangladeshi Taka ৳)** throughout. All `Decimal` fields are BDT unless noted.

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

### 2. Finance (`/admin/finance`)

- Income entries (salary, freelance, rental) by month/year
- Expense entries by category
- Monthly P&L summary

### 3. Renovation Tracker (`/admin/renovation`)

- Line items from `House_Rebuilding_Construction.xlsx`
- Grand total: ৳12,500,000
- Categories: Materials, Constructor, Services, Other Costs

### 4. AI Assistant (`/admin/ai-assistant`) ✅ functional

- Streaming chat UI built with MUI — messages scroll inside a Card, auto-resize TextField input
- Claude Sonnet 4 via Anthropic SDK — streaming responses work end-to-end
- **Next:** add tool use (Lesson 1.4) — tools: `get_payment_summary`, `get_overdue_tenants`, `get_monthly_expenses`, `get_renovation_total`

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
| 1.4    | Tool use            | 🔲 next   | `api/admin/ai/route.ts` — add Claude tools    |
| 2.x    | Streaming responses | ✅ done   | AI assistant chat — ReadableStream end-to-end |
| 3.x    | RAG / embeddings    | 🔲 future | TBD                                           |

---

## Progress log

| Date       | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-07 | Portfolio HTML completed (8.5/10), CV PDF + DOCX created, SEO implemented, all reference markdown files created                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-06-08 | Next.js project scaffolded — App Router, Prisma schema, NextAuth credentials, middleware, admin layout + sidebar, portfolio component stubs, login page, CLAUDE.md + PROJECT_PLANNING.md written                                                                                                                                                                                                                                                                                                      |
| 2026-06-08 | Local PostgreSQL set up, `.env` + `.env.local` configured, `npx prisma db push` verified                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-08 | **Portfolio fully ported** — `sass` installed; 13-file SCSS architecture; all 7 portfolio components implemented from `portfolio.html`; Nav + Footer; root layout with full SEO metadata + geo tags + 3× JSON-LD structured data; build passes zero errors                                                                                                                                                                                                                                            |
| 2026-06-08 | **Admin panel v1** — migrated from `/dashboard` to `/admin`; DB-backed auth (bcrypt passwords, seeded admin user); APP_VERSION session invalidation; dark sidebar + header layout; full route set (property/finance/renovation stubs, AI assistant streaming chat, settings, account, login)                                                                                                                                                                                                          |
| 2026-06-09 | **Admin panel v2 — MUI migration** — replaced Tailwind in all admin components with Material UI v9; Materio-inspired dark theme (`adminTheme.ts`); `AdminShell.tsx` provides `AppRouterCacheProvider` + `ThemeProvider` scoped to admin; rebuilt: sidebar (MUI List nav), header (MUI Box + Avatar), overview (animated stat cards, vivid colors), login (MUI TextField + Alert), AI chat (MUI Card + TextField multiline), settings (MUI Switch + TextField), account (MUI profile + password cards) |

---

## What to build next

In priority order:

1. **sitemap.xml + robots.txt** — `src/app/sitemap.ts` and `src/app/robots.ts` using Next.js metadata conventions
2. **Deploy to DigitalOcean** — push all commits → set up droplet → Nginx + SSL + PM2
3. **Lesson 1.4 — tool use** — add Claude tool calls to `api/admin/ai/route.ts` querying the DB (`get_payment_summary`, `get_overdue_tenants`, `get_monthly_expenses`, `get_renovation_total`)
4. **Property module** — units list, tenant details, payment tracker (mark PAID/PARTIAL/OVERDUE), due tracker
5. **Finance module** — income/expense entries, monthly P&L summary
6. **Renovation module** — line items from spreadsheet data, totals by category
