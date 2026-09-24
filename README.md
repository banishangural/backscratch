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

- Vercel runs `npm run vercel-build` (`scripts/vercel-build.sh`). On **production** and **preview** deploys it
  applies pending Prisma migrations first. Previews migrate their own Neon branch (the Neon integration
  creates one per preview), never the production database. If you turn off Neon preview branching,
  remove `preview` from the script.
- Never edit a migration that a preview or production has already applied; add a new one instead.
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

## Widget and tracking (Phase 2)

Founders add **placements** (slots) on their product page, pick a theme and layout, and paste the
install code on their site:

```html
<script src="https://YOUR_APP/w.js" data-slot="SLOT_ID" async></script>
```

The widget renders right after that tag (or inside `<div data-backscratch="SLOT_ID"></div>` if the
page has one), in a Shadow DOM, and shows nothing at all until the product has active swaps. See
[widget/README.md](widget/README.md) for how it works.

- **Go live:** approved + domain verified + widget loaded on the product's own domain (or a subdomain)
  in the last 72 hours. The product page shows this as a checklist. In development, `localhost` counts
  as every product's domain.
- **Preview:** each placement has a "Preview" page (sample cards on a light and a dark background) and
  a "Preview on my site" link that opens the founder's site with a signed token valid for 1 hour.
- **Views:** at least half of the widget visible for 1 second; one per visitor, slot, swap, and day.
- **Clicks:** `/r/<swapId>/<slotId>` records the click and redirects to the partner with
  `utm_source=backscratch&utm_medium=swap&utm_campaign=<swapId>&bs_click=<clickId>`.
- Views and clicks from bots, from pages outside the product's domain, and over the rate limits
  aren't counted. Repeat clicks by the same visitor within 30 seconds count once.

### Testing locally

1. `npm run db:seed`, then `npm run dev`.
2. Open http://localhost:3000/dev/widget-demo (development only). It's a plain page with hostile CSS
   that embeds a slot like a founder's site would. Invoicely's and MailPilot's slots show each other
   (the seeded active swap); other slots render nothing.
3. Scroll to the widget and keep it visible for a second, then click the card. Check the new `VIEW`
   and `CLICK` rows in `npm run db:studio` (Event table).
4. Sign in as `ana@example.com`, open Invoicely: add a placement, change its theme/layout, open Preview.
   To try the on-site preview locally, add the `#bs-preview=…` part of the "Preview on my site" link
   to the demo page URL (`/dev/widget-demo?slot=SLOT_ID#bs-preview=…`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Build the widget, then start the dev server |
| `npm run build` / `npm start` | Production build (widget + app) / serve |
| `npm run widget:build` | Bundle `widget/src` into `public/w.js`; fails if over 10KB gzipped |
| `npm run widget:watch` | Rebuild the widget on every change (run next to `npm run dev`) |
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
src/lib/slots/          widget placement validation (zod) and founder server actions
src/lib/widget/         widget config, visitor hashing, preview tokens, go-live rule
src/app/api/widget/     public widget endpoints (config, heartbeat, views)
src/app/r/              click redirect
src/config/             editable app config (categories, widget heading and limits)
src/generated/prisma/   generated Prisma client (git-ignored)
widget/                 embeddable widget source; built to public/w.js (git-ignored)
```
