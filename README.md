# Backscratch

A cross-promotion swap network for indie SaaS and web apps. Founders list their product, install
the "Tools we recommend" widget, and swap recommendations with partners they choose. A shared
dashboard shows the traffic each side sent.

- Product spec and phase plan: [docs/SPEC.md](docs/SPEC.md)
- Working rules for AI assistants: [CLAUDE.md](CLAUDE.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7 · Auth.js · zod.
Hosting: Vercel (app + CDN) with Neon Postgres.

## Deploying (Vercel + Neon)

- Vercel runs `npm run vercel-build` (`scripts/vercel-build.sh`). On **production** deploys it applies
  pending Prisma migrations first; preview deploys skip migrations so they never change the live schema.
- The Neon integration provides `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED`
  (direct, used by Prisma migrations).
- Other environment variables: see `.env.example`.
- Email testing: set `EMAIL_FROM="Backscratch <onboarding@resend.dev>"`. Resend only delivers from this
  test sender to your own Resend account email. Verify a domain before inviting real users.

## Local setup

Requirements: Node.js 20+ and a Debian/Ubuntu machine (for the DB script) or your own PostgreSQL.

```bash
# 1. Install and start PostgreSQL, create the "backscratch" role and database.
#    Safe to re-run; run it again at the start of every cloud session.
npm run db:setup

# 2. Create your local env file and fill in values (see comments inside).
cp .env.example .env

# 3. Install dependencies (also generates the Prisma client).
npm install

# 4. Create the tables and load fake test data.
npm run db:migrate
npm run db:seed

# 5. Start the app.
npm run dev
```

Open http://localhost:3000. `http://localhost:3000/api/health` should return
`{"ok":true,"db":"up"}`.

Using your own PostgreSQL instead of the script? Create a database and point `DATABASE_URL`
in `.env` at it. The user needs `CREATEDB` so `prisma migrate dev` can make a shadow database.

## Signing in and admin (Phase 1)

- Go to `/login` and enter an email. In development with `AUTH_RESEND_KEY` empty, the magic link is
  printed in the `npm run dev` terminal. Open it in the same browser.
- Seeded users: `ana@example.com` and `ben@example.com` (founders), and the first address in `ADMIN_EMAILS`.
- Admins are the emails in `ADMIN_EMAILS`. They see an **Admin** link in the header; everyone else gets
  a 404 on `/admin`.
- Sign-in emails are limited to 5 per email and 20 per IP per hour.

### Product lifecycle

1. **Draft**: founder creates the product and verifies the domain (meta tag or DNS TXT record, then "Check now").
2. **In review**: founder clicks "Submit for review" (only possible once the domain is verified).
3. Admin **approves** or **rejects with a reason**. Rejected products can be edited and resubmitted.
4. Admin can **suspend** (with a reason) and **unsuspend** at any time.
5. Editing name, URL, logo or pitch on an approved product sends it back to review. Changing the
   domain resets verification (back to Draft).

A domain belongs to whoever verifies it first. Unverified products may share a domain; once one is
verified, the others can't verify or be created for it.

Verification can't be tested against `localhost`: use a real site whose `<head>` or DNS you control.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm run db:setup` | Install/start local PostgreSQL and create role + database (dev only) |
| `npm run db:migrate` | Create/apply migrations after editing `prisma/schema.prisma` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Wipe the database and load fake data (refuses to run in production) |
| `npm run db:reset` | Drop everything, re-apply migrations, and re-seed |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Seed data

`npm run db:seed` creates:

- Users: an admin (first address in `ADMIN_EMAILS`, or `admin@example.com`), `ana@example.com`, `ben@example.com`
- 7 products covering every status: 4 approved (3 listed, 1 whose widget went missing), 1 pending, 1 rejected with a reason, 1 suspended
- 5 swaps: active, paused by the heartbeat rule, requested, ended, and declined
- About two weeks of views, clicks, and conversions in both directions on the active swap
- A Stripe metric snapshot and an open report

## Project layout

```
docs/SPEC.md            product spec + decisions log
prisma/schema.prisma    database schema
prisma/seed.ts          fake data for local testing
prisma.config.ts        Prisma 7 config (DB URL, migrations, seed command)
scripts/setup-dev-db.sh local PostgreSQL setup
src/app/                Next.js routes (pages + API)
src/auth.ts             Auth.js config (magic links, database sessions)
src/components/         UI components
src/lib/env.ts          validated environment variables
src/lib/db.ts           shared Prisma client
src/lib/session.ts      requireUser() / requireAdmin() helpers
src/lib/products/       product validation (zod) and founder server actions
src/lib/admin/          admin moderation actions
src/lib/verification.ts domain ownership checks (meta tag, DNS TXT)
src/lib/safe-fetch.ts   fetches founder sites safely (blocks private IPs)
src/lib/rate-limit.ts   database-backed rate limiter
src/config/             editable app config (categories)
src/generated/prisma/   generated Prisma client (git-ignored)
widget/                 embeddable widget (Phase 2)
```
