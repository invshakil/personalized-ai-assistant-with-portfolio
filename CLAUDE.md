@AGENTS.md

# CLAUDE.md — sshakil.com

Read this file completely before touching any code.
Then read **PROJECT_PLANNING.md** for architecture, progress, and what to build next.

---

## What this project is

A Next.js application for **sshakil.com** — Syful Islam Shakil's personal domain.
Two distinct surfaces:

| Route | Audience | Auth |
|-------|----------|------|
| `/` | Public — portfolio website | None |
| `/dashboard/*` | Private — personal admin dashboard | Required |
| `/login` | Auth gate | None |

---

## Stack (locked — do not change without discussion)

- **Next.js 16** — App Router, TypeScript, `src/` directory
- **Tailwind CSS v4** — utility classes only, no custom CSS files beyond `globals.css`
- **Prisma 5 + PostgreSQL** — ORM and database
- **NextAuth v5 beta** — credentials provider, JWT sessions
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) — AI features via Anthropic API
- **DigitalOcean Basic droplet** — deployment target (~$12/mo)

---

## Coding standards

### General
- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why
- **No default exports from lib files** — named exports only in `src/lib/`
- **Server components by default** — only add `"use client"` when you actually need interactivity or browser APIs
- **No inline styles** — use Tailwind classes or CSS variables from `globals.css`
- Keep components **small and single-purpose** — if a component exceeds ~150 lines, split it

### Naming conventions
- Components: `PascalCase.tsx` — e.g. `Hero.tsx`, `DashboardSidebar.tsx`
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Lib utilities: `camelCase.ts` — e.g. `auth.ts`, `db.ts`
- Types: `PascalCase` interfaces/types in `src/types/index.ts`

### File locations
```
src/app/(portfolio)/          ← public portfolio pages
src/app/(dashboard)/          ← auth-gated dashboard pages
src/app/api/                  ← API route handlers
src/components/portfolio/     ← portfolio section components
src/components/dashboard/     ← dashboard UI components
src/components/ui/            ← shared primitive components (buttons, inputs, cards)
src/components/shared/        ← shared layout components (used in both surfaces)
src/lib/auth.ts               ← NextAuth config — do not restructure
src/lib/db.ts                 ← Prisma singleton — do not create new instances
src/types/index.ts            ← all shared TypeScript types
prisma/schema.prisma          ← single source of truth for DB schema
```

### API routes
- All API routes return `{ data, error }` shaped JSON
- Always validate input — never trust request body directly
- Auth-protected routes must check session at the top: `const session = await auth(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })`

### Portfolio components
- **Read `PROJECT_PLANNING.md` → Portfolio section** before building any portfolio component
- Match colour tokens from `globals.css` exactly — do not introduce new colour values
- The design reference is the original `portfolio.html` — ask for it if you need to check something

---

## Design tokens (from globals.css — use these, never hardcode colours)

```css
--color-linen: #f5f0e8        /* hero background */
--color-sage: #8faa8b         /* sage green accent */
--color-sage-light: #e8f0e7   /* skills section background */
--color-sage-dark: #2d5a27    /* dark sage text/borders */
--color-slate: #3d5a80        /* experience section accent */
--color-slate-light: #e8eef5  /* experience section background */
--color-purple: #6b4d8f       /* projects section accent */
--color-purple-light: #f0eaf8 /* projects section background */
--color-forest: #1a3a2a       /* contact section background (dark) */
--color-forest-light: #2d5a3d /* contact section secondary */
--px: clamp(1.25rem, 5vw, 5rem) /* horizontal padding — use everywhere */
```

---

## DO NOTs

- **Do not** switch the auth provider from credentials to OAuth without explicit instruction
- **Do not** add new npm packages without checking if something already installed covers it
- **Do not** modify `prisma/schema.prisma` without updating `PROJECT_PLANNING.md`
- **Do not** put secrets or API keys in code — use `process.env.*` and `.env.local`
- **Do not** add `"use client"` to layout files
- **Do not** create new Prisma client instances — always import `{ db }` from `@/lib/db`
- **Do not** commit `.env.local` — it is in `.gitignore`
- **Do not** use the `<form>` HTML element in React components — use `onSubmit` with controlled state

---

## Environment variables

All vars live in `.env.local` (never committed). See `.env.example` for the full list.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` | App URL for NextAuth callbacks |
| `ADMIN_EMAIL` | Login email for the single admin user |
| `ADMIN_PASSWORD` | Login password for the single admin user |
| `ANTHROPIC_API_KEY` | Claude API key for AI assistant features |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `NEXT_PUBLIC_CV_URL` | Google Drive CV download link |

---

## Session continuity

**Always read `PROJECT_PLANNING.md` before starting any task.**
It contains current implementation status, what's been built, what's next, and all architectural decisions.
