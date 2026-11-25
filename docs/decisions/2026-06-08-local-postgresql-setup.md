# Local PostgreSQL set up

**Local development runs against a local PostgreSQL database, with two env files** (Shakil, 8 Jun 2026).

- Local PostgreSQL was set up.
- `.env` holds `DATABASE_URL` only, for the Prisma CLI.
- `.env.local` holds the Next.js runtime environment and is not committed.
- `npx prisma db push` was verified against the local database.

Since then: schema changes are written as Prisma migrations, and production applies them with `prisma migrate deploy`.
