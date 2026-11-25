# Admin panel v1

**The admin moved from `/dashboard` to `/admin`, with database-backed login and a full route set** (Shakil, 8 Jun 2026).

- Migrated from `/dashboard` to `/admin`.
- Database-backed auth: bcrypt passwords and a seeded admin user.
- `APP_VERSION` session invalidation: changing the value forces a new sign-in.
- Dark sidebar and header layout.
- The full route set: property, finance and renovation stubs, the AI assistant with a streaming chat, settings, account and login.

This version was styled with Tailwind. It moved to Material UI the next day: see [Admin panel v2](2026-06-09-admin-panel-v2-mui-migration.md).
