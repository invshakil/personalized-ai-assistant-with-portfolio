# No console output in committed code (#19)

**No `console.log`, `console.info`, `console.debug` or `console.warn` in committed code: errors go to the app logger in `src/lib/logger.ts`, and `console.error` is only for where the logger can't run, with the reason in an `eslint-disable` comment** (Shakil, 25 Nov 2026).

- **Why:** the logger writes to stdout and to the `LogEntry` table, so `/admin/logs` shows what happened without server access. Console calls scattered in the code bypass it.
- `scripts/` and the seed files are exempt, because they are command-line tools.
- The 14 console calls in `src/` today are fixed in the lint PR, which also turns `no-console` on as an error.
