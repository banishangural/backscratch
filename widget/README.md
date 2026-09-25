# Widget

The embeddable "Tools we recommend" widget: vanilla TypeScript bundled by esbuild into a single
`public/w.js` (git-ignored, built by `npm run dev`, `npm run build` and the Vercel build). The build
fails if the file is over 10KB gzipped. Run `npm run widget:watch` while working on it.

```html
<script src="https://YOUR_APP/w.js" data-slot="SLOT_ID" async></script>
```

Founders paste it once above the footer in their site-wide layout. It renders the footer band
after the tag (or inside `<div data-backscratch="SLOT_ID">`) and, if the product offers it, the
corner badge (fixed to the bottom-left or bottom-right of the viewport).

## Files

- `src/index.ts`: finds `script[data-slot]` tags and `[data-backscratch]` containers, fetches the
  config, sends the heartbeat, and mounts the placements.
- `src/band.ts`: the footer band (row, card, or compact layout).
- `src/badge.ts`: the corner badge: rotation, delay, minimize (7 days in the host's `localStorage`),
  phone pill, hiding while the band is visible, and stepping aside for fixed/sticky host elements.
- `src/card.ts`: shared card, logo, and "via" link builders (text via `textContent` only), and the
  viewable-impression watcher.
- `src/styles.ts`: scoped CSS with light, dark, and auto (follows the OS) themes.
- `src/types.ts`: the config shape, mirroring `src/lib/widget/config.ts`.
- `../src/lib/widget/path.ts`: page path normalizer, shared with the server.
- `build.mjs`: esbuild bundle + gzip size check.

## What happens on a page load

1. `GET /api/widget/<slot>`: heading, theme, layout, up to 3 band cards, and the badge corner and its
   partners if the product offers it. Cached for 60 seconds by browsers and Vercel's CDN. Adds
   `?preview=<token>` for the owner preview (never cached). Nothing renders if this fails or takes
   over 5 seconds.
2. `POST /api/widget/<slot>/load`: heartbeat with the page path and the placements present. Counts only
   on the product's own domain. The band on 3+ different pages in 72 hours is what makes a product live.
3. The band renders if there are cards; the badge renders (one per page) if it has partners.
4. Once at least 50% of a placement has been visible for 1 second:
   `POST /api/widget/<slot>/view` with the swap ids, placement, and page path.
5. Card links go to `/r/<swapId>/<slotId>?pl=band|badge&p=<path>`, which records the click and
   redirects to the partner.

Beacons use `navigator.sendBeacon` with a plain-text JSON body, so there are no CORS preflights, no
cookies, and nothing to wait for. The server computes the visitor hash and normalizes the path again;
the browser sends no counts.
