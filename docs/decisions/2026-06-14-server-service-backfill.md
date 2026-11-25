# Server service backfill

**Database logic was moved out of the remaining route handlers into services** (Shakil, 14 Jun 2026).

- New `src/services/property/payees.ts` and `serviceTypes.ts`.
- New `src/services/admin/` with `account.ts` (name and password) and `siteSettings.ts` (upsert).
- The payees, service-types, account and site-settings routes were rewired to delegate to those services. The new functions were added to the property barrel.

After this, only the 4 PDF-rendering routes touch `db` directly, which is intentional.

Verified: `tsc`, eslint and build clean; create, get, deactivate and validation checked at runtime.
