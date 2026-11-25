# One entry, one file, for decisions and manual tests (#19)

**Each decision is its own file in `docs/decisions/` and each manual test its own file in `docs/manual-tests/`. `docs/DECISIONS.md` and `docs/MANUAL_TESTS.md` are short READMEs with fixed text. Current state goes in `docs/STATUS.md`, which is kept current and is not a log** (Shakil, 25 Nov 2026).

- **Why:** `docs/PROJECT_PLANNING.md` had grown to 743 lines with table rows thousands of characters long, and every change appended to it. Long shared files conflict between branches and nobody reads them to the end.
- **Instead of:** appending to `docs/PROJECT_PLANNING.md` and `docs/IMPLEMENTATION_LOG.md`. Both were turned into `docs/STATUS.md`, `docs/ARCHITECTURE.md` and decision files, and removed, along with `docs/PROJECT_STATUS_REPORT.md`.
- `check:docs-entries` fails CI if either README changes. It comes with the tooling PR.
