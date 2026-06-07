# PROJECT_PLANNING.md — sshakil.com

**Owner:** Syful Islam Shakil  
**Domain:** sshakil.com  
**Repo:** https://github.com/invshakil/personalized-ai-assistant-with-portfolio  
**Last updated:** 2026-06-08

> This is the living project document. Update the **Progress** section as you implement features.
> Claude Code should read this at the start of every session.

---

## Project overview

A single Next.js application serving two purposes:

1. **Public portfolio** at `/` — replaces the static `portfolio.html`. Shows Syful's work, experience, skills, and contact info to potential clients and employers.
2. **Private dashboard** at `/dashboard` — personal admin panel for property management, finance tracking, renovation tracking, and an AI assistant powered by Claude.

---

## Architecture decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Next.js 16 App Router | SSR for portfolio SEO; server components reduce client JS |
| Auth | NextAuth v5 credentials | Single admin user — no need for OAuth complexity |
| Database | PostgreSQL + Prisma | Relational data (units→tenants→payments); Prisma gives type safety |
| Styling | Tailwind CSS v4 | Already in stack; utility-first keeps components portable |
| AI | Claude Sonnet 4 via Anthropic API | Tool use for structured data queries against DB |
| Hosting | DigitalOcean Basic droplet (~$12/mo) | Full control, PM2 + Nginx + Certbot for SSL |
| Session | JWT (not DB sessions) | Simpler for single-user setup; no session table needed |

---

## Database schema summary

Defined in `prisma/schema.prisma`. Do not modify schema without updating this document.

| Model | Purpose |
|-------|---------|
| `User` | NextAuth user (single admin) |
| `Account`, `Session`, `VerificationToken` | NextAuth internals |
| `SiteSettings` | Singleton — admin-editable portfolio content (availability, bio, CV URL) |
| `Unit` | A rentable floor/flat in Syful's building (unitNumber, floor, monthlyRent) |
| `Tenant` | Linked to a Unit; has contact info and move-in/out dates |
| `Payment` | Monthly rent payment per unit — has status (PENDING/PAID/PARTIAL/OVERDUE) |
| `Income` | Salary, freelance, rental income entries by month/year |
| `Expense` | Maintenance, utility, salary, subscription expenses |
| `RenovationItem` | Construction cost line items with category, amount, vendor, status |

Currency: **BDT (Bangladeshi Taka ৳)** throughout. All `Decimal` fields are BDT unless noted.

---

## Folder structure

```
sshakil-app/
├── prisma/
│   └── schema.prisma              ✅ complete
├── src/
│   ├── app/
│   │   ├── (portfolio)/
│   │   │   ├── layout.tsx         ✅ scaffolded
│   │   │   └── page.tsx           ✅ scaffolded (imports component stubs)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         ✅ scaffolded (auth check + sidebar)
│   │   │   └── dashboard/
│   │   │       ├── page.tsx       ✅ scaffolded (stat cards, no real data yet)
│   │   │       ├── property/      ✅ stub
│   │   │       ├── finance/       ✅ stub
│   │   │       ├── renovation/    ✅ stub
│   │   │       ├── ai-assistant/  ✅ stub
│   │   │       └── settings/      ✅ stub
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  ✅ complete
│   │   │   ├── property/          🔲 not built
│   │   │   ├── finance/           🔲 not built
│   │   │   └── ai/                🔲 not built
│   │   ├── login/page.tsx         ✅ complete (credentials form)
│   │   ├── layout.tsx             ✅ complete (fonts, metadata)
│   │   ├── globals.css            ✅ complete (colour tokens, font vars)
│   │   └── page.tsx               ✅ root → re-exports portfolio page
│   ├── components/
│   │   ├── portfolio/
│   │   │   ├── Hero.tsx           🔲 stub — needs porting from portfolio.html
│   │   │   ├── Skills.tsx         🔲 stub
│   │   │   ├── Experience.tsx     🔲 stub
│   │   │   ├── Projects.tsx       🔲 stub
│   │   │   ├── Testimonials.tsx   🔲 stub
│   │   │   ├── Education.tsx      🔲 stub
│   │   │   └── Contact.tsx        🔲 stub
│   │   ├── dashboard/
│   │   │   └── Sidebar.tsx        ✅ complete
│   │   ├── ui/                    🔲 empty — shared primitives go here
│   │   └── shared/                🔲 empty
│   ├── lib/
│   │   ├── auth.ts                ✅ complete
│   │   └── db.ts                  ✅ complete
│   ├── middleware.ts               ✅ complete (protects /dashboard/*)
│   └── types/index.ts             ✅ complete
├── .env.local                     ✅ template (fill in values locally)
├── .env.example                   ✅ safe to commit
├── CLAUDE.md                      ✅ coding standards + conventions
└── PROJECT_PLANNING.md            ✅ this file
```

**Legend:** ✅ done &nbsp;|&nbsp; 🔧 in progress &nbsp;|&nbsp; 🔲 not started

---

## Portfolio section reference

When porting `portfolio.html` into components, use this map.
The original HTML file has the full design — request it from claude.ai if needed.

| Component | Section ID | Background | Key content |
|-----------|-----------|------------|-------------|
| `Hero.tsx` | `#hero` | `--color-linen` | Photo, name, tagline, availability badge, 3 CTAs (Hire Me / View Work / Download CV) |
| `Skills.tsx` | `#skills` | `--color-sage-light` | 5 skill groups with tag pills |
| `Experience.tsx` | `#experience` | `--color-slate-light` | Two columns: full-time left, freelance right |
| `Projects.tsx` | `#projects` | `--color-purple-light` | 4 project cards, private badges, 1 GitHub link |
| `Testimonials.tsx` | `#testimonials` | white | 2 Upwork reviews, link to Upwork profile |
| `Education.tsx` | `#education` | white | 3 entries, flat flex layout |
| `Contact.tsx` | `#contact` | `--color-forest` (dark) | 5 contact links + CV download, dark bg |

**Important:** All sections use `padding: var(--px)` for horizontal spacing. Do not hardcode padding values.

### Real contact data (use exactly as-is)
- Email: syful.shakil.it@gmail.com
- Phone: +880 1675 332 265
- LinkedIn: linkedin.com/in/syful-shakil/
- GitHub: github.com/invshakil
- Upwork: upwork.com/freelancers/~0136804dec393ef25f
- CV: https://drive.google.com/file/d/15jSzTm3iaj_ghVqgC_t1Wk9bKnsIfGIA/view?usp=sharing

---

## Dashboard modules

### 1. Property Management (`/dashboard/property`)
- List all units with occupancy status
- Per-unit tenant details
- Monthly payment tracker — mark as PAID / PARTIAL / OVERDUE
- Due tracker — who hasn't paid this month

### 2. Finance (`/dashboard/finance`)
- Income entries (salary, freelance, rental) by month/year
- Expense entries by category
- Monthly P&L summary

### 3. Renovation Tracker (`/dashboard/renovation`)
- Line items from `House_Rebuilding_Construction.xlsx`
- Grand total: ৳12,500,000
- Categories: Materials, Constructor, Services, Other Costs

### 4. AI Assistant (`/dashboard/ai-assistant`)
- Chat interface powered by Claude Sonnet 4
- Uses **tool use** (Lesson 1.4) to query the database
- Tools planned: `get_payment_summary`, `get_overdue_tenants`, `get_monthly_expenses`, `get_renovation_total`
- Responds in natural language with real data from PostgreSQL

### 5. Settings (`/dashboard/settings`)
- Toggle availability for work (updates `SiteSettings.availableForWork`)
- Edit hero tagline and bio
- Update CV URL
- Changes reflect live on the public portfolio (server-rendered)

---

## Deployment plan (DigitalOcean)

### Server setup (run once)
```bash
# On droplet (Ubuntu 22.04)
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22 && nvm use 22

# PM2
npm install -g pm2
```

### Database setup
```bash
sudo -u postgres psql
CREATE DATABASE sshakil_db;
CREATE USER sshakil WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sshakil_db TO sshakil;
\q
```

### App deployment
```bash
# Clone repo
git clone https://github.com/invshakil/personalized-ai-assistant-with-portfolio /var/www/sshakil-app
cd /var/www/sshakil-app

# Set up env
cp .env.example .env.local
nano .env.local  # fill in all values

# Install, migrate, build
npm install
npx prisma migrate deploy
npm run build

# Start with PM2
pm2 start npm --name "sshakil" -- start
pm2 save && pm2 startup
```

### Nginx config
```nginx
server {
    server_name sshakil.com www.sshakil.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL
```bash
certbot --nginx -d sshakil.com -d www.sshakil.com
```

---

## AI Engineering curriculum context

This project is also the **capstone project** for Syful's AI engineering learning path.

| Lesson | Topic | Status | Where implemented |
|--------|-------|--------|------------------|
| 1.1 | Tokens & cost | ✅ done | — |
| 1.2 | Stateless API calls | ✅ done | — |
| 1.3 | Temperature | ✅ done | — |
| 1.4 | Tool use | 🔲 next | `dashboard/ai-assistant` + `api/ai/` |
| 2.x | Streaming responses | 🔲 future | AI assistant chat UI |
| 3.x | RAG / embeddings | 🔲 future | TBD |

---

## Progress log

| Date | What was done |
|------|--------------|
| 2026-06-07 | Portfolio HTML completed (8.5/10), CV PDF + DOCX created, SEO implemented, all reference markdown files created |
| 2026-06-08 | Next.js project scaffolded — App Router, Prisma schema, NextAuth credentials, middleware, dashboard layout + sidebar, portfolio component stubs, login page, CLAUDE.md + PROJECT_PLANNING.md written |

---

## What to build next

In priority order:

1. **Set up local PostgreSQL** → fill `.env.local` → run `npx prisma db push` → verify `npm run dev` starts cleanly
2. **Port portfolio components** — start with `Hero.tsx`, follow `PROJECT_PLANNING.md` portfolio section reference
3. **Connect to GitHub** → push initial scaffold → set up DigitalOcean droplet
4. **Lesson 1.4 — tool use** → build AI assistant API route with Claude tool calls querying the DB
5. **Property dashboard** — units list, payment tracker, due tracker
