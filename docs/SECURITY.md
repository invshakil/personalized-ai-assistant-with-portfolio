# Security

## Reporting a problem

If you find a security problem in this repo or on sshakil.com, **don't open a public issue or PR**. Report it privately: on GitHub, open the repo's **Security** tab and choose **Report a vulnerability**. Say what you found, how to reproduce it, and what it exposes.

## Rules

The rules on data and secrets are in [AGENTS.md](../AGENTS.md#data). These add the detail.

### Secrets and data

- **The repo is public.** Anything committed is published, and stays in git history after the file is deleted.
- `.env*` is ignored except `.env.example`, which holds names and placeholders only.
- `NEXT_PUBLIC_*` values are compiled into the browser bundle. **Never put a secret in one.**
- **AI provider keys and the Drive backup token are encrypted at rest** (AES-256-GCM, `src/services/ai/crypto.ts`) with `AI_CONFIG_SECRET`. The SolisCloud secret stays in `.env.local` and is never stored in the database.
- **Nothing secret is logged.** The logger cleans its context (`src/lib/logSanitize.ts`), and callers never pass a password, token, key or full request body.
- **Database backups and uploads never enter git:** `/backups/`, `*.dump` and `/uploads/` are ignored.
- If a secret or real personal data is committed, tell Shakil straight away. Rotate any secret. Deleting the file doesn't remove it from git history, and a PR body keeps its edit history until each old revision is deleted.

### The admin

- **Every admin API route checks the session first:** `const session = await auth(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })`, before it reads the body or the query.
- **`src/proxy.ts` gates `/admin/*` pages,** and re-issues the session cookie on each request, so the 24-hour session slides. The route check above is still required: the proxy is not the only gate.
- **Login is rate-limited** (`src/lib/loginRateLimit.ts`), and the page it returns to after login is checked against open redirects (`src/lib/callbackUrl.ts`).
- **A mutating route goes through `withApiError`** (`src/lib/apiRoute.ts`), so a failure returns the `{ data, error }` shape and no stack trace. Every new route uses it. 41 older route files don't yet, most of them property routes: see Known risks.
- **Input is validated in the service,** never trusted from the request body.
- **Raw SQL uses Prisma's tagged templates only** (`$queryRaw` with `${}` values). Never build SQL from a string.

### Public pages and endpoints

The booking form with `/api/booking/*`, and the trip page `/trips/<slug>`, need no login. The full rules are in [CODING_STANDARDS.md](CODING_STANDARDS.md#public-unauthenticated-surfaces). In short:

- **A public serializer is a whitelist** of aggregate fields, with a test that private fields don't appear.
- **Every field is length-capped and every id re-checked in the service.**
- **A public POST has a per-IP rate limit, a honeypot field and Cloudflare Turnstile,** checked on the server.
- **A public page that can trigger an outbound request or a write is served from cache** (`export const revalidate`).

### The AI assistant

- **An AI write tool never writes on its own.** It proposes an action, which is stored and shown as a card, and runs only after it's approved in the admin (`src/services/ai/proposedActions.ts`, `writeTools/`).
- **Read tools go through the same services as the admin,** so they return only what the signed-in admin can see.
- **Uploads to the assistant** are images only, at most 10 MB, checked by their first bytes and not only their declared type. They're stored under `uploads/chat/`, which is not served as static files: reads go through a route that checks the session (`src/services/ai/uploads.ts`).

### Integrations

- **SolisCloud is read-only by design.** `src/services/solis/` pulls telemetry and never sends a command to the inverter.
- **Server-side requests go only to fixed hosts:** Cloudflare, Google, Open-Meteo, the FX rate API and SolisCloud. No request uses a host a user typed.
- **Exports** (CSV and PDF) refuse cross-site requests where they are expensive to render, and cap the number of rows.

## Automated checks

| Check                        | Status                                      |
| ---------------------------- | ------------------------------------------- |
| Lint, format, typecheck      | Run in CI on every PR and on push to `main` |
| `npm audit` (high, critical) | Run by hand before a PR. Not in CI yet      |
| Tests, build                 | Run by hand before a PR. Not in CI yet      |
| Dependabot, CodeQL           | Not set up yet                              |
| Branch protection on `main`  | Off. The PR rule is agreed, not enforced    |

What changes this, and when, is in [STATUS.md](STATUS.md#standards-rollout).

## Known risks

Recorded so they're visible. This file doesn't change the code behind them.

| Risk                                                                                                     | Where                                                 | What limits it                                                                        |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Anyone with write access can push to `main`, and every push deploys                                      | GitHub settings                                       | One maintainer. Branch protection is planned                                          |
| CI runs no tests, build or audit before a deploy                                                         | `.github/workflows/deploy.yml`                        | They're run by hand before each PR                                                    |
| Workflow actions are pinned by tag, not commit, including the one that receives the deploy key           | `.github/workflows/deploy.yml`                        | Planned with the CI change                                                            |
| The deploy builds in place on the droplet, so a failed build leaves the old process running on new files | `.github/workflows/deploy.yml`                        | The deploy stops at the first error and doesn't restart the app                       |
| The deploy runs the seed each time, which sets the admin password from the environment again             | `prisma/seed.ts`                                      | The seed skips data that exists. Planned to leave the deploy                          |
| No Content-Security-Policy header                                                                        | `next.config.ts`                                      | The other security headers are set. A correct policy needs nonces                     |
| The booking rate limit reads the client address from a request header                                    | `src/app/api/booking/create/route.ts`                 | Turnstile and the honeypot still apply                                                |
| Tests delete rows through whatever database the environment names, with no check that it's local         | `src/**/__tests__/`                                   | Deletes are scoped to tagged test rows. CI and the deploy don't run tests             |
| Some property tests generate rent rows for every tenant in the local database                            | `src/services/property/__tests__/`                    | Local database only. See [TESTING.md](TESTING.md#known-problems)                      |
| 41 older route files that change data don't use `withApiError`                                           | `src/app/api/admin/property/`, `src/app/api/booking/` | They check the session and validate in the service. Listed in [STATUS.md](STATUS.md)  |
| Git history keeps every earlier version of every file, and the repo is public                            | git history                                           | Check what a commit holds before it's pushed. Deleting a file later doesn't remove it |
