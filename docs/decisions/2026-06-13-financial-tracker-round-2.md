# Financial Tracker round 2

**The Financial Tracker gained fiscal-year defaults, a date-range filter, subscriptions, PDF downloads and a themed confirm dialog** (Shakil, 13 Jun 2026).

- All list pages default to the current fiscal year.
- The dashboard has a date-range filter: this month, last 3 or 6 months, last 1 or 2 years, this fiscal year, all.
- A `Subscription` model and migration. Each active month generates one expense charge, idempotently. Subscriptions can be started, stopped and resumed, with a per-month history, at `/admin/finance/subscriptions`.
- A PDF receipt for each salary, income and expense row, and a dashboard report PDF. They use `@react-pdf/renderer` through `services/finance/pdfKit.tsx`.
- A themed delete-confirmation dialog, `components/admin/ConfirmDialog.tsx`, replaces `window.confirm`.

Verified: build, lint and `tsc` pass; HTTP smoke tests pass.
