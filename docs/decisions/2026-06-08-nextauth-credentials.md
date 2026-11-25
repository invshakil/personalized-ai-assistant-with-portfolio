# NextAuth with the credentials provider

**Admin login uses NextAuth v5 with the credentials provider** (Shakil, 8 Jun 2026).

- **Why:** there is a single admin user, so the complexity of OAuth is not needed.
- **Instead of:** an OAuth provider.

The configuration is in `src/lib/auth.ts`. The password is a bcrypt hash on the `User` row.
