# Overview dashboard on real data, and a Reports hub

**The mocked Overview was replaced with a live cross-domain snapshot, and reports moved to dedicated pages under `/admin/reports`** (Shakil, 16 Jun 2026).

Overview (`/admin`):

- A new `getAdminOverview()` service in `services/admin/overview.ts`, with `GET /api/admin/overview` and `adminApi.getOverview()`.
- A KPI row: this-month business net, property net, subscription run-rate, total rent due.
- A Financial Tracker quick view: this-month and this-fiscal-year income, costs and net.
- A Property quick view: rent collected against expected, expenses, occupancy, top dues.

Reports:

- A new Reports sidebar group with `/admin/reports/financial` and `/admin/reports/property`. Both reuse the existing dashboard components.
- The per-module "Dashboard" links were removed.
- Redirects: `/admin/finance` to `/admin/finance/earnings`, and `/admin/property/dashboard` to `/admin/reports/property`.
- Breadcrumb labels were added.

Since then: the top-level Reports sidebar entry was removed as redundant. Property, Financial Tracker and Solar each carry their own Reports child, and `/admin/reports/solar` joined the hub.

Verified: build, lint and `tsc` clean. The overview service was run against the database.
