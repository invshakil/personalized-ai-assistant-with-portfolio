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

| Decision  | Choice                               | Reason                                                                                     |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Framework | Next.js 16 App Router                | SSR for portfolio SEO; server components reduce client JS                                  |
| Auth      | NextAuth v5 credentials              | Single admin user — no need for OAuth complexity                                           |
| Database  | PostgreSQL + Prisma                  | Relational data (units→tenants→payments); Prisma gives type safety                         |
| Styling   | SCSS modules + Tailwind CSS v4       | SCSS for portfolio (variables, mixins, section partials); Tailwind for dashboard utilities |
| AI        | Claude Sonnet 4 via Anthropic API    | Tool use for structured data queries against DB                                            |
| Hosting   | DigitalOcean Basic droplet (~$12/mo) | Full control, PM2 + Nginx + Certbot for SSL                                                |
| Session   | JWT (not DB sessions)                | Simpler for single-user setup; no session table needed                                     |

---

## Database schema summary

Defined in `prisma/schema.prisma`. Do not modify schema without updating this document.

| Model                                     | Purpose                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `User`                                    | NextAuth user (single admin)                                               |
| `Account`, `Session`, `VerificationToken` | NextAuth internals                                                         |
| `SiteSettings`                            | Singleton — admin-editable portfolio content (availability, bio, CV URL)   |
| `Unit`                                    | A rentable floor/flat in Syful's building (unitNumber, floor, monthlyRent) |
| `Tenant`                                  | Linked to a Unit; has contact info and move-in/out dates                   |
| `Payment`                                 | Monthly rent payment per unit — has status (PENDING/PAID/PARTIAL/OVERDUE)  |
| `Income`                                  | Salary, freelance, rental income entries by month/year                     |
| `Expense`                                 | Maintenance, utility, salary, subscription expenses                        |
| `RenovationItem`                          | Construction cost line items with category, amount, vendor, status         |

Currency: **BDT (Bangladeshi Taka ৳)** throughout. All `Decimal` fields are BDT unless noted.

---

## Folder structure

```
sshakil-app/
├── prisma/
│   └── schema.prisma              ✅ complete
├── public/
│   └── shakil-profile.jpg         ✅ profile photo (used by Hero)
├── src/
│   ├── app/
│   │   ├── (portfolio)/
│   │   │   ├── layout.tsx         ✅ complete (Nav, Footer, 3× JSON-LD scripts)
│   │   │   └── page.tsx           ✅ complete (renders all 7 section components)
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
│   │   ├── layout.tsx             ✅ complete (fonts, full SEO metadata, geo tags)
│   │   └── page.tsx               ✅ root → re-exports portfolio page
│   ├── components/
│   │   ├── portfolio/
│   │   │   ├── Hero.tsx           ✅ complete (photo, badge, stats, CTAs)
│   │   │   ├── Skills.tsx         ✅ complete (5 skill groups, tag pills)
│   │   │   ├── Experience.tsx     ✅ complete (full-time + freelance columns)
│   │   │   ├── Projects.tsx       ✅ complete (4 cards, icons, GitHub link)
│   │   │   ├── Testimonials.tsx   ✅ complete (2 Upwork reviews, stars)
│   │   │   ├── Education.tsx      ✅ complete (3 entries, flat flex layout)
│   │   │   └── Contact.tsx        ✅ complete (5 links, SVG icons, dark bg)
│   │   ├── dashboard/
│   │   │   └── Sidebar.tsx        ✅ complete
│   │   ├── ui/                    🔲 empty — shared primitives go here
│   │   └── shared/
│   │       ├── Nav.tsx            ✅ complete ("use client", hamburger menu)
│   │       └── Footer.tsx         ✅ complete (server component)
│   ├── styles/
│   │   ├── _variables.scss        ✅ colors, fonts, breakpoints, spacing
│   │   ├── _functions.scss        ✅ rem(), alpha()
│   │   ├── _mixins.scss           ✅ respond-to, section-padding, gradient-rule, btn-base
│   │   ├── _base.scss             ✅ reset, :root, keyframes, animation classes
│   │   ├── _sections.scss         ✅ .sec, .sec-in, .lbl
│   │   ├── _nav.scss              ✅ navigation styles
│   │   ├── _hero.scss             ✅ hero section
│   │   ├── _skills.scss           ✅ skills section
│   │   ├── _experience.scss       ✅ experience section
│   │   ├── _projects.scss         ✅ projects section
│   │   ├── _education.scss        ✅ education section
│   │   ├── _testimonials.scss     ✅ testimonials section
│   │   ├── _contact.scss          ✅ contact + footer
│   │   ├── globals.scss           ✅ @use orchestrator (replaces globals.css)
│   │   └── tailwind.css           ✅ isolated Tailwind @import
│   ├── lib/
│   │   ├── auth.ts                ✅ complete
│   │   └── db.ts                  ✅ complete
│   ├── middleware.ts               ✅ complete (protects /dashboard/*)
│   └── types/index.ts             ✅ complete (+ portfolio types added)
├── .env                           ✅ Prisma CLI env (DATABASE_URL only)
├── .env.local                     ✅ Next.js runtime env (not committed)
├── .env.example                   ✅ safe to commit
├── CLAUDE.md                      ✅ coding standards + conventions
└── PROJECT_PLANNING.md            ✅ this file
```

**Legend:** ✅ done &nbsp;|&nbsp; 🔧 in progress &nbsp;|&nbsp; 🔲 not started

---

## Portfolio section reference

When porting `portfolio.html` into components, use this map.
The original HTML file has the full design — request it from claude.ai if needed.

| Component          | Section ID      | Background              | Key content                                                                          |
| ------------------ | --------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `Hero.tsx`         | `#hero`         | `--color-linen`         | Photo, name, tagline, availability badge, 3 CTAs (Hire Me / View Work / Download CV) |
| `Skills.tsx`       | `#skills`       | `--color-sage-light`    | 5 skill groups with tag pills                                                        |
| `Experience.tsx`   | `#experience`   | `--color-slate-light`   | Two columns: full-time left, freelance right                                         |
| `Projects.tsx`     | `#projects`     | `--color-purple-light`  | 4 project cards, private badges, 1 GitHub link                                       |
| `Testimonials.tsx` | `#testimonials` | white                   | 2 Upwork reviews, link to Upwork profile                                             |
| `Education.tsx`    | `#education`    | white                   | 3 entries, flat flex layout                                                          |
| `Contact.tsx`      | `#contact`      | `--color-forest` (dark) | 5 contact links + CV download, dark bg                                               |

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

| Lesson | Topic               | Status    | Where implemented                    |
| ------ | ------------------- | --------- | ------------------------------------ |
| 1.1    | Tokens & cost       | ✅ done   | —                                    |
| 1.2    | Stateless API calls | ✅ done   | —                                    |
| 1.3    | Temperature         | ✅ done   | —                                    |
| 1.4    | Tool use            | 🔲 next   | `dashboard/ai-assistant` + `api/ai/` |
| 2.x    | Streaming responses | 🔲 future | AI assistant chat UI                 |
| 3.x    | RAG / embeddings    | 🔲 future | TBD                                  |

---

## Progress log

| Date       | What was done                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-07 | Portfolio HTML completed (8.5/10), CV PDF + DOCX created, SEO implemented, all reference markdown files created                                                                                                                                                                                                                                                                  |
| 2026-06-08 | Next.js project scaffolded — App Router, Prisma schema, NextAuth credentials, middleware, dashboard layout + sidebar, portfolio component stubs, login page, CLAUDE.md + PROJECT_PLANNING.md written                                                                                                                                                                             |
| 2026-06-08 | Local PostgreSQL set up (`local_personalized_ai_assistant` DB), `.env` + `.env.local` configured, `npx prisma db push` verified                                                                                                                                                                                                                                                  |
| 2026-06-08 | **Portfolio fully ported** — `sass` installed; 13-file SCSS architecture built (variables, mixins, functions, 9 section partials); all 7 portfolio components implemented from `portfolio.html`; Nav + Footer added; root layout updated with full SEO metadata + geo tags; portfolio layout updated with 3× JSON-LD structured data scripts; `npm run build` passes zero errors |

---

## What to build next

In priority order:

1. **sitemap.xml + robots.txt** — add `src/app/sitemap.ts` and `src/app/robots.ts` using Next.js metadata conventions (user mentioned these are coming)
2. **Connect to GitHub** → push all commits → set up DigitalOcean droplet
3. **Lesson 1.4 — tool use** → build AI assistant API route with Claude tool calls querying the DB
4. **Property dashboard** — units list, payment tracker, due tracker
5. **Finance dashboard** — income/expense entries, monthly P&L
