# PostgreSQL with Prisma 5

**The database is PostgreSQL, accessed through Prisma 5** (Shakil, 8 Jun 2026).

- **Why:** the data is relational (units, then tenants, then payments), and Prisma gives type safety.

`prisma/schema.prisma` is the single source of truth for the schema. There is one Prisma client, exported as `db` from `src/lib/db.ts`.
