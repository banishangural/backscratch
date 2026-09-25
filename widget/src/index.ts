import { normalizePath } from "../../src/lib/widget/path";
import { mountBadge } from "./badge";
import { renderBand } from "./band";
import type { Config, Ctx } from "./types";

// Backscratch "Tools we recommend" widget.
//   <script src="https://…/w.js" data-slot="SLOT_ID" async></script>
// Goes above the footer in the site-wide layout. Renders the footer band right after the script
// tag (or inside <div data-backscratch="SLOT_ID"> if the page has one), plus the corner badge
// when the product offers it.
// Rule #1: never break the host page. Every failure ends silently with nothing rendered.

const DONE = "data-bs-done";

function send(url: string, body: object) {
  try {
    navigator.sendBeacon(url, JSON.stringify(body)); // text/plain: no CORS preflight
  } catch {
    // ignore
  }
}

// Owner preview: a signed token in the page URL (#bs-preview=…) or on the script/container.
function previewToken(node: Element) {
  return node.getAttribute("data-preview") || location.hash.match(/bs-preview=([\w.-]+)/)?.[1] || null;
}

async function fetchConfig(url: string): Promise<Config | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { credentials: "omit", signal: controller.signal });
    if (!res.ok) return null;
    const config = (await res.json()) as Config;
    return Array.isArray(config?.c) ? config : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let badgeMounted = false; // one badge per page, even if the script is included twice

async function mount(slot: string, api: string, place: (host: HTMLElement) => void, token: string | null) {
  if (!/^[a-z0-9]{20,32}$/.test(slot)) return;
  const base = `${api}/api/widget/${slot}`;
  const config = await fetchConfig(token ? `${base}?preview=${encodeURIComponent(token)}` : base);
  if (!config) return;

  const h = location.hostname;
  const p = normalizePath(location.pathname);
  // Heartbeat: the band's spot is on this page (wherever the script is), and the badge if offered.
  send(`${base}/load`, { h, p, pl: config.b ? ["band", "badge"] : ["band"] });

  const ctx: Ctx = {
    config,
    href: (card, pl) => (config.pv ? null : `${api}/r/${card.s}/${slot}?pl=${pl}&p=${encodeURIComponent(p)}`),
    view: (s, pl) => send(`${base}/view`, { s, pl, p, h }),
  };

  let band: HTMLElement | null = null;
  if (config.c.length > 0) {
    band = document.createElement("div");
    place(band);
    renderBand(band, ctx, api);
  }
  if (config.b && config.b.c.length > 0 && !badgeMounted) {
    badgeMounted = true;
    mountBadge(ctx, api, slot, band);
  }
}

// Our API lives wherever this script was loaded from. Captured now: currentScript is
// only set while the script first runs.
const self = document.currentScript as HTMLScriptElement | null;

function init() {
  const api = new URL(self?.src || location.href).origin;
  const start = (slot: string, place: (host: HTMLElement) => void, token: string | null) =>
    mount(slot, api, place, token).catch(() => {});

  // Explicit containers first: <div data-backscratch="SLOT_ID"></div>
  const claimed = new Set<string>();
  for (const container of document.querySelectorAll<HTMLElement>(`[data-backscratch]:not([${DONE}])`)) {
    container.setAttribute(DONE, "");
    const slot = container.getAttribute("data-backscratch") || "";
    claimed.add(slot);
    start(slot, (host) => container.append(host), previewToken(container));
  }

  // Otherwise render right after the script tag (or at the end of <body> if it's in <head>).
  for (const script of document.querySelectorAll<HTMLScriptElement>(`script[data-slot]:not([${DONE}])`)) {
    script.setAttribute(DONE, "");
    const slot = script.getAttribute("data-slot") || "";
    if (claimed.has(slot)) continue;
    const inHead = script.parentElement === document.head;
    start(slot, (host) => (inHead ? document.body.append(host) : script.after(host)), previewToken(script));
  }
}

function safeInit() {
  try {
    init();
  } catch {
    // never break the host page
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", safeInit);
else safeInit();
