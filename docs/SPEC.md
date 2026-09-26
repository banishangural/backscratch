You are helping me build Backscratch ([APP_NAME] below): a cross-promotion swap network for indie SaaS and web apps. Founders list their product, install a small "Tools we recommend" widget on their site, browse other verified products, and agree to swap recommendations. Both widgets then show each other's product, and a shared dashboard shows exactly what each side sent.

I'm a solo developer comfortable with HTML, CSS, JavaScript, Node.js, and SQL. Work in phases. At the end of each phase, stop, summarize what you built, list how I can test it, and wait for my go-ahead before starting the next phase.

## Core principles
- Founders choose their own partners. There is NO credit system. Fairness comes from transparency: every swap shows the traffic sent in both directions.
- The widget must be tiny, fast, tasteful and unobtrusive: clean cards, one partner at a time in the corner badge, easy for visitors to minimize, never covering content or the host's own buttons. Founders will not install anything that slows their site down or looks like a spammy ad.
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
- Product: name, URL, domain, logo, one-line pitch, category, audience description, status (draft/pending/approved/rejected/suspended, with a reason shown to the founder; a rejected product can be edited and resubmitted), visibility settings for each metric, placements offered (footer band always; corner badge optional) and the badge corner (left/right)
- DomainVerification: method (meta tag or DNS TXT), token, verified_at
- Slot: the product's single widget install (one per product, created automatically). One script tag renders the footer band and, if offered, the corner badge. Last seen time, host, and page path are recorded per placement for the heartbeat. Widget only; there are no tracked links.
- Swap: product_a, product_b, status (requested/active/paused/ended/declined), request message, start date, end date (default 30 days), renewal state
- Event: type (view/click/conversion), swap, slot, placement (band/badge), source product, destination product, page path (views and clicks), timestamp, daily-salted visitor hash (never raw IP)
- MetricSnapshot: verified revenue range, active subscriptions, customer count, source (stripe/trustmrr), fetched_at
- PageViewSnapshot: daily verified page views and visitors per product (and per page path where the provider supports it), source (ga4/plausible/umami), fetched_at
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
- Placements: a required full-width "Tools we recommend" band directly above the site footer on every page, plus an optional corner badge (see Phase 2.1; the first build allowed free-named placements).
- One script tag install: <script src=".../w.js" data-slot="SLOT_ID" async></script>
- The widget heading is always "Tools we recommend". Founders cannot change it; only the app owner can, via one app-wide config value.
- Renders up to 3 partner product cards (logo, name, one-line pitch) inside a Shadow DOM so host CSS can't break it. Light/dark/auto themes, and a compact and a card layout. It must look clean and tasteful, never like a banner ad. Include a tiny "via [APP_NAME]" link.
- Widget config (which partners to show) comes from a cached API endpoint; the widget must fail silently and invisibly if our API is down. Never break the host page.
- Viewable impressions only: count a view when at least 50% of the widget is visible for 1 second (IntersectionObserver). Dedupe views per visitor hash per slot per day.
- Clicks go through a redirect endpoint (/r/...) that records the click and forwards to the destination with UTM parameters (utm_source=[APP_NAME], utm_medium=swap, utm_campaign=<swap id>) plus a click ID parameter.
- Heartbeat: every widget load updates the slot's last_seen_at.
- Before any swaps exist, the widget shows a preview state visible only to the owner (e.g. via a query param or when logged in) so they can check placement and styling.
- Every product must install the widget to go live. A product appears in the marketplace only when: (1) it is admin-approved and its domain is verified, (2) its widget has loaded on its real site within the last 72 hours, and (3) from Phase 3 on, it has a connected traffic integration (GA4, Plausible, or Umami), optionally with a minimum monthly visitor count (MARKETPLACE_MIN_MONTHLY_VISITORS).
- Basic bot filtering: ignore known bot user agents, rate-limit event endpoints, and dedupe rapid repeated clicks.

### Phase 2.1: Placement rework
Aligns the Phase 2 code with the fixed placements.
- One install per product, created automatically (no add/rename/remove). The same script tag goes above the footer in the site-wide layout/template, so it appears on every page.
- Footer band (required): full-width "Tools we recommend" band with up to 3 partners; card, compact, or a new "row" layout (cards side by side, wrapping on small screens); light/dark/auto theme.
- Corner badge (optional, founder ticks it in product settings; no code change needed): one partner at a time, rotating across page views; founder picks the left or right corner; visitors can minimize it to a small tab, remembered for about 7 days in first-party storage on the host site (no cookies of ours); a small pill on phones that opens on tap; appears after a short delay or a little scrolling; never covers content or the host's buttons.
- A swap runs only on the placements both products offer: always the band, plus the badge when both offer it.
- Placement changes: (a) offering the badge is standing permission: active swaps add it automatically when the partner also offers it, and both founders are notified; (b) removing the badge takes it off both sides of every swap immediately; (c) an offered placement not seen within 72 hours is treated as not offered: swaps fall back to the band and the founder is warned.
- Record the placement and the page path on every view and click. Store the path only: no query string or fragment, and number/ID-like segments replaced with ":id" (e.g. "/invoices/:id"). Show the founder a path breakdown (e.g. "/blog 70%, / 20%, /pricing 10%"); partners see it from Phase 3.
- Go-live check: the band must have been seen within 72 hours on several distinct pages (a signal it's in the site-wide layout, not on one hidden page).
- Owner preview shows both placements.

### Phase 3: Marketplace
- Traffic verification first (moved here from Phase 6): when listing, founders connect GA4 (Google Analytics Data API, OAuth, read-only), or Plausible (Stats API key) or Umami (API) as alternatives. Check whether DataFast offers a public API; if it does, add it, and if not, tell me. Read each provider's official docs before implementing. Credentials encrypted at rest, never logged, never sent to the client. Refresh daily into PageViewSnapshot. Disconnecting deletes the stored credentials and snapshots.
- A connected traffic integration is required to go live (listing rule condition 3), plus MARKETPLACE_MIN_MONTHLY_VISITORS if set. The go-live checklist shows it.
- Browse approved, live products with filters: category, audience keywords, revenue range, verified monthly traffic, click rate.
- Each product shows its placements ("Footer" or "Footer + badge"), with a filter for them. Before sending a request, founders see which placements the swap will run on.
- Product cards and profiles show verified monthly site traffic, verified page views for the pages where the band appears (site-wide, so the site's total page views), and where the band actually loads (page path breakdown).
- Product profile pages showing only the metrics the founder chose to make public, each labeled with its source ("verified via GA4", "verified via Stripe", "measured by [APP_NAME]").
- "Suggested matches": simple rules for now, based on complementary categories (define a category complement map I can edit) and excluding direct competitors (same category). Keep it easy to swap in smarter matching later.

### Phase 4: Swap requests and lifecycle
- Send a swap request with a short personal message. The recipient can accept or decline. Email notifications for both.
- Active swaps appear in both products' widgets automatically.
- Default 30-day duration; 5 days before the end, both founders get an email to renew. A swap renews only if both agree.
- Either side can pause or end a swap anytime, effective immediately.
- Limits: a max number of active swaps per product (configurable), and no duplicate requests (only one open swap per product pair). After a decline, the same side must wait 14 days before requesting again. If a product has more active swaps than the widget can show, the widget rotates partners.
- Heartbeat rule: if a partner's slot hasn't been seen for 72 hours, pause the swap automatically and email both founders.

### Phase 5: Balance dashboard and conversions
- Per swap: clicks and conversions sent in each direction are the headline fairness numbers, and the at-a-glance "balance" indicator is based on them. Numbers are shown per placement and per direction. Views, click rate, and page paths are shown as secondary detail. Include a simple chart over time.
- View check: daily, compare our widget views with the verified analytics page views for the same pages, per placement. Badge views should be close to page views; band views should be lower (only visitors who scroll down to it count). If either is clearly higher than page views (e.g. over 1.3x across 7 days, above a minimum volume), flag the swap.
- Click check: compare our click count with the visits the receiving product's analytics reports for utm_campaign=<swap id>, and flag large gaps.
- Flags show both founders on the swap a neutral "these numbers don't line up" note; admins see the details (Phase 7).
- Per product: total traffic received from all swaps, and which swaps perform best.
- Optional conversion tracking: a tiny snippet the receiving product installs. On landing, it reads the click ID from the URL and stores it in first-party localStorage; when the founder calls a signup/conversion function, it reports the conversion with that click ID. Document this clearly.
- Weekly email report per founder (scheduled job).

### Phase 6: Verified revenue integrations
- Stripe: the founder creates a restricted, read-only key (give them step-by-step instructions listing exactly which read permissions are needed). Encrypt keys at rest; never log them; never send them to the client. Compute active subscriptions, customer count, and an approximate MRR (normalize intervals to monthly, exclude trials, account for discounts), and store it as a range band, not an exact number, unless the founder opts in to exact.
- TrustMRR: a founder can paste their TrustMRR profile URL to import verified metrics. Read TrustMRR's official API docs before implementing; do not guess endpoints. If an API key is required, stop and tell me.
- Traffic integrations (GA4, Plausible, Umami, DataFast) moved to Phase 3.
- Refresh verified revenue metrics on a daily schedule. Founders can disconnect any integration, which deletes the stored credentials and snapshots.

### Phase 7: Trust, safety, and launch readiness
- "Report this product" flow and admin review.
- Admin dashboard: products, swaps, reports, suspicious traffic patterns (e.g. click rates far above normal), and view/click mismatch flags from Phase 5 with the numbers behind them.
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
- Phase 0: tracked links removed; the widget is the only placement and is required to go live. (Refined after Phase 2: one fixed placement, see below.)
- Phase 0: marketplace listing rule = approved + verified domain + widget seen within 72h (+ verified integration from Phase 6). (Changed after Phase 2: the integration requirement is a traffic integration, from Phase 3.)
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
- Preview deploys now run migrations too, against their own Neon branch (Neon integration creates a branch per Preview deployment). Production still migrates on deploy.
- Phase 2: a widget load counts toward going live only on the product's verified domain or its subdomains (localhost too, in development). Views and clicks from other hosts aren't counted.
- Phase 2: owner preview uses a signed, slot-bound token valid for 1 hour (in the page URL as `#bs-preview=…`), plus an in-app preview page. Preview shows sample cards and records nothing.
- Phase 2: old daily salts are deleted when the next day's salt is created (no cron needed). Unlisting is a query-time check (`liveProductWhere`), so no cron yet; the scheduler is chosen in Phase 4.
- Phase 2: the widget renders nothing until its config arrives. Founders are told to place it below the fold or in a sidebar; a reserved-height option can come in Phase 7.
- Phase 2: widget endpoints use the existing Postgres-backed rate limiter; revisit (e.g. Redis) only if traffic needs it.
- Phase 2: views are deduped per visitor, slot, swap, and day (one VIEW row per swap shown). A product with more than 3 active swaps shows a random 3 per 60-second cache window.
- Phase 2: `Slot.lastSeenHost` added (host of the last counted widget load, shown to the founder).
- After Phase 2 (replaced by the next entry): one fixed placement per product, a full-width "Tools we recommend" band directly above the site footer on every page, created automatically. Replaces the free-named placements built in Phase 2. Chosen because every product has a public footer, founders accept it, it looks native, and it makes swaps directly comparable. A two-placement idea (footer + after-signup page) was dropped: after-signup pages differ between products, often sit behind a login, and can't be verified. More visible spots (floating badge, top bar) were rejected as too ad-like.
- After Phase 2: placements are a required footer band plus an optional corner badge, from one script tag. A swap runs on the placements both products offer (always the band; the badge only if both offer it). Offering the badge is standing permission for active swaps to add it; removing it removes it from both sides immediately; an offered placement not seen within 72h counts as not offered (fallback to the band, founder warned). Why: the target audience is early-stage founders who want maximum visibility, and the badge is the most visible spot every site has; the footer stays required so any two products can always swap. Numbers are shown per placement and direction. The "look native" principle became "tasteful and unobtrusive".
- After Phase 2: views and clicks record the page path (path only; no query string or fragment; ID-like segments become ":id"). The path breakdown is shown to the founder and to partners.
- After Phase 2: traffic verification (GA4, or Plausible/Umami) moves from Phase 6 to Phase 3 and is required to go live. The marketplace shows verified site traffic and verified page views for the band's pages. Phase 6 keeps Stripe and TrustMRR.
- After Phase 2: our widget views are compared with analytics page views for the same pages, and our clicks with the partner's analytics visits for utm_campaign=<swap id>. Mismatches are flagged: a neutral note to both founders, details to admins.
- After Phase 2: clicks and conversions are the headline fairness numbers on the balance dashboard; views are secondary.
- After Phase 2: new Phase 2.1 (placement rework) comes before Phase 3.
- Phase 2.1: the go-live check needs the band on at least 3 distinct (normalized) page paths within 72h (`MIN_BAND_PAGES`). The heartbeat stores per-placement, per-path sightings (`PlacementPage`, up to 200 paths per placement, forgotten after 7 days) and sets `Slot.bandSpreadAt` when the check passes, so the listing rule stays a query-time filter. Products live at migration time were grandfathered (their old last-seen time became `bandSpreadAt`).
- Phase 2.1: the badge counts as "seen" when the widget loads on the product's own domain while the badge is offered (not only when it's shown with a partner), otherwise a newly offered badge could never become active.
- Phase 2.1: the 72h "placement not seen" warnings are shown on the product page; emailing them waits for the scheduler (Phase 4).
- Phase 2.1: migration to one slot per product kept each product's oldest active slot (its install code keeps working), moved events from the others to it, and deleted them; their old codes now render nothing. Migrations that move data are wrapped in BEGIN/COMMIT.
- Phase 2.1: offering the badge emails both founders of each active swap whose partner offers it; removing it emails those partners too (a small addition to the spec). At most 4 of these per product per day.
- Phase 2.1: page paths come from the widget (browsers send only the origin as the Referer to other sites) and are normalized both in the widget and again on the server. They're labels only, never counts.
- Phase 2.1: the badge hides while the band is on screen, collapses to its tab (or hides) when a fixed or sticky host element (chat button, cookie bar) is under it (page-sized, invisible, or click-through fixed layers such as backgrounds are ignored), and counts a view only when its open card is visible. On phones it starts as a pill. Minimized state (7 days) and the rotation counter live in the host's localStorage. z-index 900: above typical sticky headers, below most modals.
- Phase 2.1: the band layouts are row (new default; the old "card" look, cards side by side), card (stacked), and compact. Existing "card" slots became "row".
- Open (confirm at the start of Phase 3): GA4 needs the `analytics.readonly` OAuth scope; Google likely requires app verification before public users can connect, and a Google Cloud project is needed.
- Known limit: we can't technically force the band to sit above the footer; the several-distinct-pages check, the owner preview, and admin review cover it.
