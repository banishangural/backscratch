#Backscratch

A cross-promotion swap network for indie SaaS and web apps. Founders list their product, install a small "Tools we recommend" widget on their site, browse other verified products, and agree to swap recommendations. A shared dashboard shows exactly what each side sent.

The full product spec and phase plan live in docs/SPEC.md. Read it before starting any phase.

## Core principles
- Founders choose their own partners. No credit or points system. Fairness comes from transparent two-way traffic numbers.
- The widget must be tiny (<10KB gzipped), fast, never break or slow the host page, and look native, not like an ad.
- Metrics come only from our own event records or verified integrations. Never trust client-sent numbers.
- Privacy: no third-party cookies, no fingerprinting, no raw IPs stored (daily-salted hashes only).

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS
- PostgreSQL + Prisma
- Auth.js with Resend magic links
- zod for all input validation
- Widget: vanilla TypeScript, single bundled file, Shadow DOM
- Prisma 7: config in prisma.config.ts, client generated to src/generated/prisma, pg driver adapter
- Hosting: Vercel (app + CDN) with Neon Postgres. Production deploys run `prisma migrate deploy` automatically (scripts/vercel-build.sh); previews do not.
- Neon: app uses pooled `DATABASE_URL`; Prisma CLI uses direct `DATABASE_URL_UNPOOLED`
- Hourly cron: scheduler not chosen yet (Vercel Hobby cron runs at most once a day). Decide with me when the first cron job is built.
- Email: Resend. Testing uses the sender `onboarding@resend.dev`, which only delivers to the Resend account owner's email. Real users need a verified domain.
- Next.js 16: read node_modules/next/dist/docs/ before writing Next.js code (see AGENTS.md)

## Security rules (non-negotiable)
- Never read, print, log, or commit .env or any secret. Use .env.example with placeholder values.
- Payment-provider and analytics credentials are encrypted at rest, never logged, never sent to the client.
- Check ownership on every product, slot, and swap mutation.
- Rate-limit all public endpoints (widget config, events, redirects).

## How we work
- Work one phase at a time, as defined in docs/SPEC.md. Never start the next phase without my approval.
- Plan before coding: outline the files you'll create or change and any schema changes, then wait for my OK.
- At the end of each phase: run type checks and lint, summarize what was built, give me step-by-step testing instructions, and suggest a commit message.
- Keep components small and readable. I maintain this myself.
- For external APIs (Stripe, TrustMRR, GA4, Plausible, Umami), read the official docs before implementing. Never guess endpoints or permissions.
- If something is ambiguous or impractical, ask me instead of choosing silently.

## Current status
- Phase: 0 complete (awaiting approval for Phase 1)
- Local dev DB: run `npm run db:setup` at the start of every cloud session (container is ephemeral).
