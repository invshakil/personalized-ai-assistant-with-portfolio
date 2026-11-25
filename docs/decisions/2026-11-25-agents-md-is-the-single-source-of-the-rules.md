# AGENTS.md is the single source of the rules (#19)

**`AGENTS.md` holds every shared rule, for Codex, Claude Code and people; `CLAUDE.md` only adds what is specific to Claude Code and loads it with `@AGENTS.md`** (Shakil, 25 Nov 2026).

- **Why:** most rules lived in `CLAUDE.md`, which Codex doesn't read, so Codex missed them. One file means a rule is changed in one place.
- **Instead of:** keeping the rules in `CLAUDE.md` and copying them into `AGENTS.md`.
- Project knowledge that isn't a rule moved to [docs/ARCHITECTURE.md](../ARCHITECTURE.md). `CODING_CONVENTION.md` moved from the repo root to [docs/CODING_STANDARDS.md](../CODING_STANDARDS.md).
