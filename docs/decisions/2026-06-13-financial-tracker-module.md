# Financial Tracker module

**The business finance spreadsheet (`Financial Tracker.xlsx`) was ported into the admin as the Financial Tracker module** (Shakil, 13 Jun 2026).

- 6 new Prisma models and a migration: `Employee`, `IncomeSource`, `BizExpenseCategory`, `Earning`, `EmployeePayment`, `BizExpense`.
- The unused generic `Income` model and `IncomeCategory` enum were removed. The `Expense` model was kept: it backs the property expense tracker.
- `src/lib/fiscalYear.ts`: fiscal year helpers. The fiscal year runs July to June and is stored on each row.
- 212 rows were exported to `prisma/data/financial-tracker.json`, with an idempotent seeder (`npm run seed:financial`). All the spreadsheet's totals reconcile.
- `src/services/finance/` and 13 API routes under `src/app/api/admin/finance/`.
- Pages: a dashboard (profit and loss, charts, per-employee, remittance), earnings, salaries and expenses with create, edit and delete, and settings.
- A "Financial Tracker" sub-navigation in the sidebar.

Verified: build, lint and typecheck pass; an authenticated end-to-end smoke test.

The module's design and data model are tracked in `docs/FINANCIAL_TRACKER.md`.
