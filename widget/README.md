# Widget

The embeddable "Tools we recommend" widget: vanilla TypeScript bundled by esbuild into a single
`public/w.js` (git-ignored, built by `npm run dev`, `npm run build` and the Vercel build). The build
fails if the file is over 10KB gzipped. Run `npm run widget:watch` while working on it.

```html
<script src="https://YOUR_APP/w.js" data-slot="SLOT_ID" async></script>
```

## Files

- `src/index.ts`: finds `script[data-slot]` tags and `[data-backscratch]` containers, sends the
  heartbeat, fetches the config, and counts views.
- `src/render.ts`: builds the cards inside a closed Shadow DOM (text via `textContent` only).
- `src/styles.ts`: scoped CSS with light, dark, and auto (follows the OS) themes; card and compact layouts.
- `src/types.ts`: the config shape, mirroring `src/lib/widget/config.ts`.
- `build.mjs`: esbuild bundle + gzip size check.

## What happens on a page load

1. `POST /api/widget/<slot>/load`: heartbeat. Counts only on the product's own domain.
2. `GET /api/widget/<slot>`: heading, theme, layout, and up to 3 partner cards. Cached for 60 seconds
   by browsers and Vercel's CDN. Adds `?preview=<token>` for the owner preview (never cached).
3. If there are no cards, or anything fails or takes over 5 seconds, nothing is rendered.
4. Once at least 50% of the widget has been visible for 1 second: `POST /api/widget/<slot>/view`.
5. Card links go to `/r/<swapId>/<slotId>`, which records the click and redirects to the partner.

Beacons use `navigator.sendBeacon` with a plain-text JSON body, so there are no CORS preflights, no
cookies, and nothing to wait for. The server computes the visitor hash; the browser sends no counts.
