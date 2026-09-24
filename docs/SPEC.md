You are helping me build Backscratch ([APP_NAME] below): a cross-promotion swap network for indie SaaS and web apps. Founders list their product, install a small "Tools we recommend" widget on their site, browse other verified products, and agree to swap recommendations. Both widgets then show each other's product, and a shared dashboard shows exactly what each side sent.

I'm a solo developer comfortable with HTML, CSS, JavaScript, Node.js, and SQL. Work in phases. At the end of each phase, stop, summarize what you built, list how I can test it, and wait for my go-ahead before starting the next phase.

## Core principles
- Founders choose their own partners. There is NO credit system. Fairness comes from transparency: every swap shows the traffic sent in both directions.
- The widget must be tiny, fast, and look native on partner sites. Founders will not install anything that slows their site down or looks like a spammy ad.
- Trust is the product. Ownership is verified, numbers come from real integrations or our own tracking (never self-reported), and quality is moderated.
- Privacy-respecting tracking: no third-party cookies, no fingerprinting, no personal data about end visitors.

## Tech stack (use these unless you have a strong reason not to; if so, explain before changing)
- Next.js (App Router) with TypeScript, Tailwind CSS
- PostgreSQL with Prisma ORM
- Auth.js with magic-link email via Resend (AUTH_RESEND_KEY)
- Widget: plain vanilla JavaScript/TypeScript, no framework, bundled to a single file under 10KB gzipped, served with long-lived caching
- zod for all input validation
- Scheduled jobs: protected `/api/cron/*` routes (Bearer `CRON_SECRET`), triggered hourly by a scheduler (to be chosen; Vercel Hobby cron runs at most daily)
- Hosting: Vercel (app, with Vercel's CDN caching `w.js` and widget config) + Neon Postgres. Production deploys apply Prisma migrations automatically
- All secrets in .env with a .env.example

## Data model (starting point; refine in Phase 0 and explain changes)
- User
- Product: name, URL, domain, logo, one-line pitch, category, audience description, status (draft/pending/approved/rejected/suspended, with a reason shown to the founder; a rejected product can be edited and resubmitted), visibility settings for each metric
- DomainVerification: method (meta tag or DNS TXT), token, verified_at
- Slot: a placement of the widget on a product's site (e.g. "thank-you page", "dashboard sidebar"), with last_seen_at for heartbeat. Widget only; there are no tracked links.
- Swap: product_a, product_b, status (requested/active/paused/ended/declined), request message, start date, end date (default 30 days), renewal state
- Event: type (view/click/conversion), swap, slot, source product, destination product, timestamp, daily-salted visitor hash (never raw IP)
- MetricSnapshot: verified revenue range, active subscriptions, customer count, traffic, source (stripe/trustmrr/ga4/plausible/umami), fetched_at
- Report: reporter, reported product, reason, status

## Phases

### Phase 0: Setup
Project scaffold, Prisma schema, env config, seed script with a few fake products for local testing, README with setup steps.

### Phase 1: Accounts, product profiles, ownership, moderation
- Magic-link login.
- Create and edit a product profile.
- Domain ownership verification by meta tag OR DNS TXT record, with a "check now" button and clear instructions. A product cannot go live without it.
- Admin approval queue (admin determined by an ADMIN_EMAILS env var): approve, reject with reason, suspend. Founders see their status and any rejection reason.

### Phase 2: The widget and tracked links
- One script tag install: <script src=".../w.js" data-slot="SLOT_ID" async></script>
- The widget heading is always "Tools we recommend". Founders cannot change it; only the app owner can, via one app-wide config value.
- Renders up to 3 partner product cards (logo, name, one-line pitch) inside a Shadow DOM so host CSS can't break it. Light/dark/auto themes, and a compact and a card layout. It must look clean and native, never like a banner ad. Include a tiny "via [APP_NAME]" link.
- Widget config (which partners to show) comes from a cached API endpoint; the widget must fail silently and invisibly if our API is down. Never break the host page.
- Viewable impressions only: count a view when at least 50% of the widget is visible for 1 second (IntersectionObserver). Dedupe views per visitor hash per slot per day.
- Clicks go through a redirect endpoint (/r/...) that records the click and forwards to the destination with UTM parameters (utm_source=[APP_NAME], utm_medium=swap, utm_campaign=<swap id>) plus a click ID parameter.
- Heartbeat: every widget load updates the slot's last_seen_at.
- Before any swaps exist, the widget shows a preview state visible only to the owner (e.g. via a query param or when logged in) so they can check placement and styling.
- Every product must install the widget to go live. A product appears in the marketplace only when: (1) it is admin-approved and its domain is verified, (2) its widget has loaded on its real site within the last 72 hours, and (3) from Phase 6 on, it has at least one verified integration (GA4, Plausible, Umami, Stripe, or TrustMRR), optionally with a minimum monthly visitor count (MARKETPLACE_MIN_MONTHLY_VISITORS).
- Basic bot filtering: ignore known bot user agents, rate-limit event endpoints, and dedupe rapid repeated clicks.

### Phase 3: Marketplace
- Browse approved, live products with filters: category, audience keywords, revenue range, monthly slot views, click rate.
- Product profile pages showing only the metrics the founder chose to make public, each labeled with its source ("verified via Stripe", "measured by [APP_NAME]").
- "Suggested matches": simple rules for now, based on complementary categories (define a category complement map I can edit) and excluding direct competitors (same category). Keep it easy to swap in smarter matching later.

### Phase 4: Swap requests and lifecycle
- Send a swap request with a short personal message. The recipient can accept or decline. Email notifications for both.
- Active swaps appear in both products' widgets automatically.
- Default 30-day duration; 5 days before the end, both founders get an email to renew. A swap renews only if both agree.
- Either side can pause or end a swap anytime, effective immediately.
- Limits: a max number of active swaps per product (configurable), and no duplicate requests (only one open swap per product pair). After a decline, the same side must wait 14 days before requesting again. If a product has more active swaps than the widget can show, the widget rotates partners.
- Heartbeat rule: if a partner's slot hasn't been seen for 72 hours, pause the swap automatically and email both founders.

### Phase 5: Balance dashboard and conversions
- Per swap: views, clicks, click rate, and conversions sent in each direction, with a simple chart over time and an at-a-glance "balance" indicator.
- Per product: total traffic received from all swaps, and which swaps perform best.
- Optional conversion tracking: a tiny snippet the receiving product installs. On landing, it reads the click ID from the URL and stores it in first-party localStorage; when the founder calls a signup/conversion function, it reports the conversion with that click ID. Document this clearly.
- Weekly email report per founder (scheduled job).

### Phase 6: Verified metrics integrations
- Stripe: the founder creates a restricted, read-only key (give them step-by-step instructions listing exactly which read permissions are needed). Encrypt keys at rest; never log them; never send them to the client. Compute active subscriptions, customer count, and an approximate MRR (normalize intervals to monthly, exclude trials, account for discounts), and store it as a range band, not an exact number, unless the founder opts in to exact.
- TrustMRR: a founder can paste their TrustMRR profile URL to import verified metrics. Read TrustMRR's official API docs before implementing; do not guess endpoints. If an API key is required, stop and tell me.
- Traffic: GA4 Data API (OAuth), Plausible Stats API, and Umami API. Check whether DataFast offers a public API; if it does, add it, and if not, tell me.
- Refresh verified metrics on a daily schedule. Founders can disconnect any integration, which deletes the stored credentials and snapshots.

### Phase 7: Trust, safety, and launch readiness
- "Report this product" flow and admin review.
- Admin dashboard: products, swaps, reports, suspicious traffic patterns (e.g. click rates far above normal).
- Rate limiting on all API routes, audit of ownership checks on every mutation, and security review of credential handling.
- Terms of service and privacy policy placeholder pages explaining what data we collect and how credentials are handled.
- Empty states, error states, loading states, and a 404 page.
- Performance check: widget bundle size, widget load time, and confirm the widget never causes layout shift on host pages (reserve its space or render below the fold).

## Explicit non-goals (do not build)
- Credit or points systems
- Paid placements, billing, or Stripe payments for our own product
- AI-powered matching
- Team accounts or multiple users per product
- Native mobile SDKs

## Working rules
- Keep components small and readable; I'll maintain this myself.
- Validate all input with zod. Check ownership on every product, slot, and swap mutation.
- Never trust numbers sent from the client for metrics; all counts come from our own event records or verified integrations.
- When an external API (Stripe, TrustMRR, GA4, Plausible, Umami) behaves differently than expected, read its official docs and tell me what you found. Don't guess.
- If a requirement is ambiguous or impractical, ask me or propose an alternative rather than silently choosing.

## Decisions log
- Phase 0: widget heading fixed to "Tools we recommend" (app-wide, not founder-editable).
- Phase 0: tracked links removed; the widget is the only placement and is required to go live.
- Phase 0: marketplace listing rule = approved + verified domain + widget seen within 72h (+ verified integration from Phase 6).
- Phase 0: added REJECTED (and DRAFT) product status with a reason; founders can resubmit.
- Phase 0: users may own several products; each product has exactly one owner.
- Phase 0: 14-day cooldown before re-requesting a declined swap.
- Phase 0: hosting on Railway + Cloudflare CDN; hourly cron via a Railway cron service calling /api/cron/* routes.
- Hosting changed to Vercel + Neon (replaces the Railway + Cloudflare entry above). Migrations run on production deploys only; hourly cron scheduler still to be decided.
- Email testing uses Resend's `onboarding@resend.dev` sender (delivers only to the Resend account owner); a verified domain is needed before real users.
- Phase 0: in development only, if AUTH_RESEND_KEY is empty, magic links are printed to the server console.
- Phase 1: a domain belongs to whoever verifies it first (`Product.verifiedDomain` is unique). Unverified drafts may share a domain.
- Phase 1: the domain must be verified before a product can be submitted for review.
- Phase 1: editing name, URL, logo or pitch of an approved product sends it back to review; changing the domain also resets verification (back to draft).
- Phase 1: logos are https image URLs pasted by the founder (no uploads yet).
- Phase 1: "Check now" tries both the meta tag and the DNS TXT record; the method that succeeded is recorded.
