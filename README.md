# sshakil.com

A personal site and private admin dashboard for **Syful Islam Shakil**, built as one Next.js app with two distinct surfaces:

| Surface       | Route          | Audience                     | Auth     |
| ------------- | -------------- | ---------------------------- | -------- |
| **Portfolio** | `/`            | Public — résumé / portfolio  | None     |
| **Admin**     | `/admin/*`     | Private — personal dashboard | Required |
| **Login**     | `/admin/login` | Auth gate                    | None     |

The public side is a marketing/portfolio page. The private side is a full operations dashboard — finances, rental property management, home **solar monitoring**, reports, database backups, and an **AI assistant that can read _and_ write your data through natural language** (behind an approval gate).

---

## Highlights

- **AI assistant with tool use** — chat over your real data. The model calls read tools to answer questions and proposes write actions (create/update) that you approve with a button before anything is saved. Vendor-neutral provider seam (Claude today; OpenAI/Gemini are drop-in adapter slots), encrypted API keys, prompt caching, and `/property` · `/finance` · `/money`.`/solar` slash commands to scope the toolset.
- **Financial tracker** — client income, employee salaries, business expenses, and recurring subscriptions, with fiscal-year (Jul→June) reporting in BDT (৳).
- **Property management** — rental units, tenants, monthly rent rows, payments, property expenses, add-on services, scheduled rent changes, and PDF rent receipts.
- **Solar monitoring** — read-only SolisCloud telemetry synced on a schedule into local readings. Reports use a text-first layout (stacked source-split bar, inline self-sufficiency meters, range presets 1M/3M/6M/12M/All) covering generation, consumption split by solar/battery/grid, electricity-cost savings under effective-dated BPDB slab tariffs, a payback/ROI tracker, CO₂ avoided, and a 7-day weather + predicted-generation forecast at the bottom. The inverter is never controlled — read-only by design.
- **Reports & dashboard** — month/fiscal-year overviews with charts.
- **Database backups** — one-click `pg_dump`, optional upload to your Google Drive, scheduled retention.
- **Two isolated design systems** — Tailwind v4 + SCSS for the portfolio, MUI v9 (themeable, settings-driven) for the admin.

---

## Tech stack

| Area         | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Framework    | **Next.js 16** (App Router, TypeScript strict, `src/`)      |
| UI (public)  | **Tailwind CSS v4** + SCSS                                  |
| UI (admin)   | **Material UI v9** + Emotion                                |
| Database     | **PostgreSQL** via **Prisma** (41 models)                   |
| Auth         | **NextAuth v5** (credentials provider, JWT sessions)        |
| AI           | **Anthropic SDK** behind a vendor-neutral `AiProvider` seam |
| PDF / charts | `@react-pdf/renderer`, `recharts`                           |
| Runtime      | Node 22+                                                    |
| Deploy       | DigitalOcean Basic droplet                                  |

---

## Getting started

**Prerequisites:** Node 22+, a PostgreSQL database, and (optionally) an Anthropic API key for the assistant.

```bash
# 1. Install deps (also wires up the git pre-commit hooks)
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in the values (see below)

# 3. Set up the database
npx prisma migrate deploy    # or `prisma db push` for a fresh local DB
npm run seed                 # seed the admin user + base data

# 4. Run
npm run dev                  # http://localhost:3000  (portfolio)
                             # http://localhost:3000/admin/login  (dashboard)
```

### Environment variables

All secrets live in `.env.local` (never committed). See `.env.example` for the full list.

| Variable                                                | Purpose                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                                          | PostgreSQL connection string                                        |
| `AUTH_SECRET`                                           | NextAuth JWT secret (`openssl rand -base64 32`)                     |
| `AUTH_URL`                                              | App URL for auth callbacks                                          |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                        | Credentials for the single admin user                               |
| `ANTHROPIC_API_KEY`                                     | Bootstraps the Claude provider on first run (then managed in-app)   |
| `AI_CONFIG_SECRET`                                      | 32-byte base64 key (AES-256-GCM) encrypting AI keys + Drive token   |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_CV_URL`           | Public site URL and CV download link                                |
| `BACKUP_DIR` / `PG_BIN_DIR`                             | Where backups are written / location of `pg_dump` if not on PATH    |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Optional — Drive upload for backups (local backups work without it) |
| `SOLIS_KEY_ID` / `SOLIS_KEY_SECRET` / `SOLIS_API_URL`   | SolisCloud API credentials for solar monitoring (read-only)         |

---

## Folder structure

```
src/
├── app/
│   ├── (portfolio)/          Public portfolio pages (Tailwind)
│   ├── (admin)/              Auth-gated dashboard (MUI, themed via AdminShell)
│   │   └── admin/            account · ai-assistant · finance · property · renovation · reports · settings
│   ├── admin/login/          Login page (outside the admin group — no sidebar)
│   └── api/admin/            API route handlers (thin — delegate to services/)
├── services/<domain>/        Server business logic + Prisma (finance, property, admin, ai, solar, solis)
│   ├── ai/                   Provider seam, tool catalog, read/write tools, sessions, usage
│   ├── solis/                SolisCloud signed client (read-only) + sync + scheduler
│   └── solar/                Tariff math (slab), report aggregation, payback, weather
├── lib/
│   ├── api/                  Client-side Axios API layer (components call these, not fetch())
│   ├── auth.ts               NextAuth config
│   ├── db.ts                 Prisma singleton
│   └── adminTheme.ts         Settings-driven MUI theme
├── components/
│   ├── portfolio/            Portfolio sections (Tailwind)
│   ├── admin/                Shared admin components (MUI)
│   └── shared/               Nav, Footer
└── types/                    Shared types per module + index.ts barrel — import from "@/types"

prisma/schema.prisma          Single source of truth for the DB schema
docs/                         Architecture & deep-dive docs (see below)
```

**Key architectural rules** (enforced by convention — see `CLAUDE.md`):

- **Two styling systems never mix** — Tailwind only in portfolio, MUI `sx` only in admin.
- **Services are the single source of truth** — API routes _and_ AI tools both call `src/services/<domain>/`. Route handlers stay thin.
- **Client components call `src/lib/api/`** (typed Axios), never `fetch()` with inline URLs.
- The AI provider/model/key is resolved at runtime via `getActiveProvider()` — never hardcoded.

---

## The AI assistant

The standout feature. How it works end to end:

1. You chat in `/admin/ai-assistant`. Optionally prefix with `/property`, `/finance`, `/money`, or `/solar` to load only that module's tools (cheaper, more focused).
2. The model answers questions by calling **read tools** (live data, no side effects).
3. To change data it calls a **write tool** — which only _proposes_ the action and renders an **approval card**. Nothing is written while the model is in the loop.
4. You click **Approve**; a separate endpoint commits it through the same service layer the dashboard uses. (Deletes are intentionally not exposed to the AI.)

Supporting pieces: **prompt caching** (1-hour TTL on tool definitions to cut token cost), **module scoping**, per-message **token/cost display**, and a **monthly budget** guard. The catalog auto-warns when the tool count crosses thresholds suggesting a switch to a tool-selector strategy.

See [docs/AI_TOOLS_REFERENCE.md](docs/AI_TOOLS_REFERENCE.md) for the full tool list and selection strategy.

---

## Scripts

| Command                   | Does                                          |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Start the dev server                          |
| `npm run build` / `start` | Production build / serve                      |
| `npm run lint`            | ESLint over `src/`                            |
| `npm run format`          | Prettier write (`format:check` to verify)     |
| `npm run seed`            | Seed admin user + base data                   |
| `npm run seed:financial`  | Seed financial sample data                    |
| `npm run seed:solar`      | Seed solar system details + BPDB tariffs      |
| `npm run db:restore`      | Restore a `pg_dump` backup                    |
| `npm run solis:test`      | Test the SolisCloud connection + print fields |
| `npm run test`            | Run unit tests (node:test via tsx)            |

---

## Documentation

Deeper docs live in [`docs/`](docs/):

- [PROJECT_PLANNING.md](docs/PROJECT_PLANNING.md) — architecture, implementation status, decisions (read this first when contributing)
- [SERVICE_LAYER.md](docs/SERVICE_LAYER.md) — service-layer conventions and data access
- [AI_TOOLS_REFERENCE.md](docs/AI_TOOLS_REFERENCE.md) — AI tool catalog & tool-selection strategy
- [FINANCIAL_TRACKER.md](docs/FINANCIAL_TRACKER.md) — finance module domain model
- [AI_ENGINEERING_LEARNING_PROGRESS.md](docs/AI_ENGINEERING_LEARNING_PROGRESS.md) — AI-engineering learning notes

For agent/contributor instructions and the full coding standards, see [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md).

---

## License

Personal project — all rights reserved.
