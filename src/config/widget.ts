// App-wide widget settings. Founders can't change these; edit here to change every widget.

// The heading shown above partner cards on every widget.
export const WIDGET_HEADING = "Tools we recommend";

// Most partner cards one widget shows. Products with more active swaps rotate.
export const MAX_WIDGET_CARDS = 3;

// How long browsers and Vercel's CDN may cache a slot's widget config.
export const WIDGET_CONFIG_CACHE_SECONDS = 60;

// A product is live only if its widget loaded on its own domain within this window.
export const LIVE_WINDOW_HOURS = 72;

// Heartbeats update Slot.lastSeenAt at most this often, to keep database writes low.
export const HEARTBEAT_WRITE_INTERVAL_MINUTES = 5;

// Repeat clicks by the same visitor on the same swap within this window count once.
export const CLICK_DEDUPE_SECONDS = 30;

// Query parameters added to partner links by the /r/ redirect.
export const UTM_SOURCE = "backscratch";
export const UTM_MEDIUM = "swap";
export const CLICK_ID_PARAM = "bs_click";

// Placements per product (archived ones don't count).
export const MAX_SLOTS_PER_PRODUCT = 10;

// Shown in the owner-only preview before any swaps exist.
export const PREVIEW_CARDS = [
  { name: "Your partner's product", pitch: "Their one-line pitch appears here." },
  { name: "Another partner", pitch: "Up to three partners are shown at a time." },
  { name: "A third partner", pitch: "Cards use each product's logo, name, and pitch." },
];
