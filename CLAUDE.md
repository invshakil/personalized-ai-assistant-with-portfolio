# sshakil.com: Claude Code

Follow [AGENTS.md](AGENTS.md). It holds every rule shared with Codex, and this line loads it:

@AGENTS.md

This file only adds what is specific to Claude Code.

## Commands

| Command                                   | What it does                                                    |
| ----------------------------------------- | --------------------------------------------------------------- |
| `npm ci`                                  | Install exactly what `package-lock.json` says                   |
| `npm run dev`                             | Local server on port 3000: Shakil's port                        |
| `npm run build` / `npm start`             | Production build and server. Agents add `-- -p 3100` to `start` |
| `npm run lint`                            | ESLint over `src/`                                              |
| `npx tsc --noEmit`                        | Typecheck                                                       |
| `npm run format:check` / `npm run format` | Prettier: check, or write                                       |
| `npm test`                                | Every `node:test` suite, one file at a time, on the local DB    |
| `npm audit --omit=dev --audit-level=high` | Fails on high or critical production advisories                 |
| `npm run eval:categorize`                 | The AI categorisation eval. Calls the real API, so it costs     |

Run heavy steps with `nice -n 10`, and never leave a server running between steps: see [Local heavy work](AGENTS.md#local-heavy-work). Background Bash commands count.

## Review and audit

Each runs in a fresh session, not the one that wrote the code. Their reports go to `../reviews/personalized-ai-assistant-portfolio/`, outside the repo, and neither changes code. The `/review` and `/audit` commands for this repo arrive in a later PR: see [docs/STATUS.md](docs/STATUS.md#standards-rollout).

## The RTK hook

Shakil's shell hook rewrites commands such as `git log` and `grep` to `rtk …`, which shortens their output. When the output looks cut or reformatted, run the command as `rtk proxy <command>`.

`npx prisma db push` doesn't work through the hook. Apply SQL with `rtk proxy npx prisma db execute`.
