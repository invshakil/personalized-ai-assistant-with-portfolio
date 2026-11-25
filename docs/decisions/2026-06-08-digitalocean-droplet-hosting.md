# Hosting on a DigitalOcean droplet

**The site is hosted on one DigitalOcean Basic droplet, with PM2, Nginx and Certbot** (Shakil, 8 Jun 2026).

- **Why:** full control of the server.

PM2 keeps the Next.js process running, Nginx proxies the domain to it, and Certbot manages the SSL certificate. PostgreSQL runs on the same droplet.

The original plan was a manual deployment: clone the repo on the server, fill in `.env.local`, install, run `prisma migrate deploy`, seed the admin user, build, and start the app under PM2. Deployment now runs from GitHub Actions on every push to `main`. How it works today is in [ARCHITECTURE.md](../ARCHITECTURE.md#ci-and-deployment).
