# Running the site

Check a change on a local production build, on the local database. `npm run dev` compiles each page on first visit, so it's slow and shows blank moments that production doesn't.

```sh
npm ci
npm run build
npm start
```

- The site is on `http://localhost:3000`. That port is Shakil's: agents use 3100 (`npm start -- -p 3100`).
- `AUTH_URL` in `.env.local` must match the port you use, or the login redirects to the other one.
- The database is the one in `DATABASE_URL` in `.env.local`. It must be local.
- After pulling a branch that changes `prisma/schema.prisma`, apply the new migration and run `npx prisma generate` first. How to apply it locally is in [ARCHITECTURE.md](../ARCHITECTURE.md#local-development).
- Stop the server with Ctrl+C when you're done.
