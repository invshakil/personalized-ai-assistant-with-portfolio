# Client API layer on Axios

**Client components call a typed Axios layer in `src/lib/api/`, not `fetch()` with inline URLs** (Shakil, 14 Jun 2026).

- `axios` was installed.
- `src/lib/api/client.ts` exposes `apiGet`, `apiPost`, `apiPut`, `apiDelete` and `apiUpload` over an instance with base URL `/api/admin`. It unwraps `{ data, error }` and throws on failure.
- Per-domain modules: `finance.ts`, `property.ts`, `admin.ts`.
- Every inline `fetch("/api/admin/…")` call in 21 client components was moved to the typed layer.

Two things stay on native APIs: the AI streaming endpoint (`fetch`) and PDF downloads (`window.open`).

The audit for this work also found that the payees, service-types, account and settings routes queried `db` directly. That became the next piece of work: see [Server service backfill](2026-06-14-server-service-backfill.md).

Verified: `tsc`, eslint and build all clean.
