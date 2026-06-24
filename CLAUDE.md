@AGENTS.md

# CLAUDE.md — sshakil.com

Read this file completely before touching any code.
Then read **docs/PROJECT_PLANNING.md** for architecture, progress, and what to build next.

---

## What this project is

A Next.js application for **sshakil.com** — Syful Islam Shakil's personal domain.
Two distinct surfaces:

| Route          | Audience                           | Auth     |
| -------------- | ---------------------------------- | -------- |
| `/`            | Public — portfolio website         | None     |
| `/admin/*`     | Private — personal admin dashboard | Required |
| `/admin/login` | Auth gate                          | None     |

---

## Stack (locked — do not change without discussion)

- **Next.js 16** — App Router, TypeScript, `src/` directory
- **Tailwind CSS v4** — portfolio surface only; no Tailwind in admin components
- **Material UI v9** (`@mui/material`) — admin surface only; do not use in portfolio components
- **Prisma 5 + PostgreSQL** — ORM and database
- **NextAuth v5 beta** — credentials provider, JWT sessions
- **AI provider seam** (`src/services/ai/`) — vendor-neutral `AiProvider` interface; the active provider, model, and encrypted API key are managed in Settings → AI. Claude adapter implemented (default model `claude-sonnet-4-6`); OpenAI/Gemini are future adapter files. Don't hardcode a provider/model/key in the chat route — resolve via `getActiveProvider()`.
- **DigitalOcean Basic droplet** — deployment target (~$12/mo)

**The two styling systems are strictly separated by surface:**

| Surface   | Styling            | Entry point                               |
| --------- | ------------------ | ----------------------------------------- |
| Portfolio | Tailwind v4 + SCSS | `src/styles/tailwind.css`, `globals.scss` |
| Admin     | MUI v9 + emotion   | `src/lib/adminTheme.ts`, `AdminShell.tsx` |

---

## Coding standards

### General

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why
- **No default exports from lib files** — named exports only in `src/lib/`
- **Server components by default** — only add `"use client"` when you actually need interactivity or browser APIs
- Keep components **small and single-purpose** — if a component exceeds ~150 lines, split it

### Styling rules by surface

**Portfolio** (`src/app/(portfolio)/`, `src/components/portfolio/`, `src/components/shared/`):

- Tailwind utility classes only
- No inline styles — use Tailwind or CSS variables from `globals.css`
- Match colour tokens from `globals.css` exactly — do not introduce new colour values
- The design reference is the original `portfolio.html`

**Admin** (`src/app/(admin)/`, `src/components/admin/`):

- MUI components only — `Box`, `Card`, `Typography`, `TextField`, `Button`, etc.
- Use the `sx` prop for layout and overrides; never use Tailwind classes in admin components
- Never use `className` with Tailwind utilities inside the `(admin)` route group
- All colours come from the MUI theme (`adminTheme`) — never hardcode hex values in admin components
- Use `color="primary.main"`, `bgcolor="background.paper"`, etc., not raw hex strings
- Animations: use `@emotion/react` `keyframes` helper (already installed as MUI dependency)
- Do **not** use `<Box component="nav">` — the portfolio has a global `nav { position: fixed }` SCSS rule that bleeds in. Use `<Box role="navigation">` instead.

### Naming conventions

- Components: `PascalCase.tsx` — e.g. `Hero.tsx`, `AdminSidebar.tsx`
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Lib utilities: `camelCase.ts` — e.g. `auth.ts`, `db.ts`, `adminTheme.ts`
- Types: `PascalCase` interfaces/types in `src/types/` per-module files (`property.ts`, `finance.ts`, `admin.ts`, `portfolio.ts`), re-exported via the `index.ts` barrel — always import from `@/types`

### File locations

```
src/app/(portfolio)/              ← public portfolio pages
src/app/(admin)/                  ← auth-gated admin pages (MUI themed via AdminShell)
src/app/admin/login/              ← login page (outside admin group — no sidebar; has its own ThemeProvider)
src/app/api/admin/                ← admin API route handlers (thin; delegate to src/services/)
src/services/<domain>/            ← server services: business logic + Prisma (finance, property, solar)
src/services/solis/               ← SolisCloud signed API client (READ-ONLY) + sync + scheduler
src/services/solar/               ← tariff slab math, report aggregation, payback, weather (Open-Meteo)
src/lib/api/                      ← client API layer (Axios) — components call these, not fetch()
src/components/portfolio/         ← portfolio section components (Tailwind)
src/components/admin/             ← shared admin components (MUI)
src/components/shared/            ← layout components shared across portfolio (Nav, Footer)
src/lib/auth.ts                   ← NextAuth config — do not restructure
src/lib/db.ts                     ← Prisma singleton — do not create new instances
src/lib/adminTheme.ts             ← MUI dark theme (Materio-inspired) — edit here for admin colours
src/types/                        ← shared TypeScript types, per module (property/finance/admin/portfolio.ts) + index.ts barrel
prisma/schema.prisma              ← single source of truth for DB schema
```

### Admin layout architecture

```
(admin)/layout.tsx          ← server component; auth check only; passes session to AdminShell
(admin)/AdminShell.tsx      ← "use client"; AppRouterCacheProvider + ThemeProvider + CssBaseline + flex layout
components/admin/
  AdminSidebar.tsx          ← "use client"; MUI List nav; uses <Box role="navigation"> (not <nav>)
  AdminHeader.tsx           ← "use client"; MUI Box header; breadcrumb + user avatar
  AdminBreadcrumb.tsx       ← "use client"; MUI Typography breadcrumb
  PageHeader.tsx            ← server-safe; MUI Typography h5 + subtitle
  StatCard.tsx              ← legacy; individual stat card (use inline stat grid in OverviewPage instead)
  StubPage.tsx              ← MUI Card "Coming soon" template for unbuilt modules
  ChatMessage.tsx           ← MUI Avatar + Box chat bubble
  FormField.tsx             ← MUI Typography label wrapper (used by legacy forms)
```

### API routes

- All API routes return `{ data, error }` shaped JSON
- Always validate input — never trust request body directly
- Auth-protected routes must check session at the top: `const session = await auth(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })`
- Route handlers stay thin: delegate business/DB logic to a function in `src/services/<domain>/` (reusable by AI tool calls too). Don't put `db.*` queries directly in a route when the domain has a service layer.

### Data-access layers (do not bypass)

Two distinct layers — keep them separate:

- **Server services** (`src/services/<domain>/`) — business logic + Prisma access. Used by API routes and AI tools. Returns JSON-safe data (see `_serializers.ts`).
- **Client API** (`src/lib/api/`) — Axios-based typed client. **Client components must call these, never `fetch()` with inline URLs.** `client.ts` exposes `apiGet/apiPost/apiPut/apiDelete/apiUpload` (baseURL `/api/admin`, unwraps `{data,error}`, throws `Error(error)` on failure); per-domain modules: `finance.ts`, `property.ts`, `admin.ts`.
  - Pattern: `const rows = await financeApi.listPayments(); setRows(rows ?? [])`; mutations go in `try/catch` and read `e.message`.
  - Exceptions that stay on native APIs: PDF downloads (`window.open(routeUrl)`) and the AI streaming endpoint (`fetch` + `ReadableStream`).

---

## Admin MUI theme tokens (`src/lib/adminTheme.ts`)

The admin theme is **settings-driven**, not a static object. `createAdminTheme(settings, resolvedMode)`
builds the theme from the `AdminThemeSettings` singleton (mode, primary colour, card shadow/border,
border radius, density, font size). `adminTheme` (= `createAdminTheme()` with defaults) is exported only
for the login page, which has no DB session. Live preference state lives in `AdminThemeProvider`
(`components/admin/AdminThemeProvider.tsx`); the `(admin)` layout loads the singleton via
`getThemeSettings()` and seeds it (no flash). Edit/customise theme at **/admin/settings/appearance**.

Always reference palette keys in `sx` props — never hardcode hex. Values below are the **dark** defaults;
the **light** mode (`mode: "light"` or `"system"`) supplies its own paper/text/divider tokens, so use the
semantic keys and both modes work automatically.

| Token                | Dark default | Use                            |
| -------------------- | ------------ | ------------------------------ |
| `background.default` | `#25293c`    | Page background                |
| `background.paper`   | `#2f3349`    | Cards, sidebar, header         |
| `primary.main`       | `#7367f0`\*  | Accent — buttons, active state |
| `success.main`       | `#28c76f`    | Green — active/OK badges       |
| `warning.main`       | `#ff9f43`    | Amber — warnings               |
| `error.main`         | `#ea5455`    | Red — errors, overdue          |
| `info.main`          | `#00cfe8`    | Cyan — info                    |
| `text.primary`       | `#cfd3ec`    | Main text                      |
| `text.secondary`     | `#8692a8`    | Muted text, labels             |
| `divider`            | rgba         | Borders between sections       |

\* `primary.main` is user-configurable in Appearance settings; `light`/`dark` shades are derived.

---

## Portfolio design tokens (from `globals.css` — portfolio surface only)

```css
--color-linen: #f5f0e8 /* hero background */ --color-sage: #8faa8b /* sage green accent */
  --color-sage-light: #e8f0e7 /* skills section background */ --color-sage-dark: #2d5a27
  /* dark sage text/borders */ --color-slate: #3d5a80 /* experience section accent */
  --color-slate-light: #e8eef5 /* experience section background */ --color-purple: #6b4d8f
  /* projects section accent */ --color-purple-light: #f0eaf8 /* projects section background */
  --color-forest: #1a3a2a /* contact section background (dark) */ --color-forest-light: #2d5a3d
  /* contact section secondary */ --px: clamp(1.25rem, 5vw, 5rem)
  /* horizontal padding — use everywhere */;
```

---

## DO NOTs

- **Do not** switch the auth provider from credentials to OAuth without explicit instruction
- **Do not** add new npm packages without checking if something already installed covers it
- **Do not** modify `prisma/schema.prisma` without updating `docs/PROJECT_PLANNING.md`
- **Do not** put secrets or API keys in code — use `process.env.*` and `.env.local`
- **Do not** add `"use client"` to `layout.tsx` files (exception: `AdminShell.tsx` is a separate client component, not a layout file)
- **Do not** create new Prisma client instances — always import `{ db }` from `@/lib/db`
- **Do not** commit `.env.local` — it is in `.gitignore`
- **Do not** use Tailwind classes inside admin components — use MUI `sx` prop
- **Do not** use MUI components inside portfolio components — use Tailwind
- **Do not** use `<Box component="nav">` in admin — use `<Box role="navigation">` (global SCSS `nav { position: fixed }` bleeds in)
- **Do not** use the `<form>` HTML element in React components — use `onSubmit` with controlled state
- **Do not** add inverter-control / write endpoints to `src/services/solis/` — the SolisCloud integration is **read-only by design**. We only pull telemetry; we never command the inverter.

---

## Environment variables

All vars live in `.env.local` (never committed). See `.env.example` for the full list.

| Variable                                                | Purpose                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | PostgreSQL connection string                                                                                              |
| `AUTH_SECRET`                                           | NextAuth JWT secret (`openssl rand -base64 32`)                                                                           |
| `AUTH_URL`                                              | App URL for NextAuth callbacks                                                                                            |
| `ADMIN_EMAIL`                                           | Login email for the single admin user                                                                                     |
| `ADMIN_PASSWORD`                                        | Login password for the single admin user                                                                                  |
| `ANTHROPIC_API_KEY`                                     | Bootstraps the Claude provider on first run (then managed in Settings → AI)                                               |
| `AI_CONFIG_SECRET`                                      | 32-byte base64 key (AES-256-GCM) encrypting AI provider API keys **and** the Drive backup refresh token at rest           |
| `NEXT_PUBLIC_SITE_URL`                                  | Public site URL                                                                                                           |
| `NEXT_PUBLIC_CV_URL`                                    | Google Drive CV download link                                                                                             |
| `BACKUP_DIR`                                            | Where `pg_dump` backups are written (defaults to `./backups`)                                                             |
| `PG_BIN_DIR`                                            | Folder holding `pg_dump`/`pg_restore` if not on PATH (macOS Homebrew libpq: `/opt/homebrew/opt/libpq/bin`)                |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client for uploading DB backups to your Google Drive (Settings → Backups). Optional — local backups work without it |
| `SOLIS_KEY_ID` / `SOLIS_KEY_SECRET`                     | SolisCloud API credentials (Basic Settings → API Management). Secret stays in `.env.local`; never persisted to the DB     |
| `SOLIS_API_URL`                                         | SolisCloud API base URL (usually `https://www.soliscloud.com:13333`)                                                      |

---

## Session continuity

**Always read `docs/PROJECT_PLANNING.md` before starting any task.**
It contains current implementation status, what's been built, what's next, and all architectural decisions.
