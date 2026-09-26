import { cardLink, el, logo, via, watchViews } from "./card";
import { BADGE_CSS } from "./styles";
import type { Card, Ctx } from "./types";

// The corner badge: one partner per page view, rotating, in the founder's chosen corner.
// It stays out of the way:
// - appears only after a short delay or a little scrolling;
// - visitors can minimize it to a small tab, remembered for 7 days (host-site localStorage,
//   no cookies); on phones it starts as that tab ("pill") and opens on tap;
// - hides while the footer band is on screen (no duplicate, never over the footer);
// - collapses to the tab, or hides, when the host has its own fixed or sticky element there
//   (chat buttons, cookie bars, bottom navs).

const DELAY_MS = 3000;
const SCROLL_PX = 200;
const MINIMIZE_MS = 7 * 24 * 60 * 60 * 1000;

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked: the badge just won't remember
  }
}

// Next partner in the rotation (random when storage is blocked).
function pick(cards: Card[], slot: string) {
  const key = `bs-r-${slot}`;
  const stored = load(key);
  const index = stored === null ? Math.floor(Math.random() * cards.length) : Number(stored) || 0;
  save(key, String(index + 1));
  return cards[index % cards.length];
}

// Is one of the host's own floating elements (chat button, cookie bar, bottom nav) under this
// node? Returns it, or null. Checks a 3×3 grid of points inset from the edges (rounded shapes
// like chat bubbles don't reach their bounding box corners).
function blocker(node: HTMLElement, host: HTMLElement) {
  const r = node.getBoundingClientRect();
  if (!r.width) return null;
  const inset = Math.min(10, r.width / 4, r.height / 4);
  for (const x of [r.left + inset, (r.left + r.right) / 2, r.right - inset]) {
    for (const y of [r.top + inset, (r.top + r.bottom) / 2, r.bottom - inset]) {
      for (const found of document.elementsFromPoint(x, y)) {
        if (found !== host && floating(found)) return found;
      }
    }
  }
  return null;
}

// Fixed or sticky, visible, clickable, and smaller than the page. Page-sized fixed layers
// (backgrounds, layout wrappers, click-through overlays) don't count: they'd hide the badge
// on every page.
function floating(found: Element) {
  if (found === document.body || found === document.documentElement) return false;
  const style = getComputedStyle(found);
  if (!/fixed|sticky/.test(style.position)) return false;
  if (style.pointerEvents === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const r = found.getBoundingClientRect();
  return !(r.width >= innerWidth / 2 && r.height >= innerHeight / 2);
}

export function mountBadge(ctx: Ctx, api: string, slot: string, band: HTMLElement | null) {
  const { config } = ctx;
  const badge = config.b!;
  const card = pick(badge.c, slot);
  const minKey = `bs-m-${slot}`;

  const host = el("div");
  const side = badge.k === "l" ? "left" : "right";
  host.style.cssText = `position:fixed;bottom:16px;${side}:16px;z-index:900;display:none`;
  const root = host.attachShadow({ mode: "closed" });
  const style = el("style");
  style.textContent = BADGE_CSS;

  const wrap = el("div", `w ${config.t}`);
  wrap.setAttribute("role", "complementary");
  wrap.setAttribute("aria-label", config.h);

  const box = el("div", "bx");
  const head = el("div", "hd");
  const minimize = el("button", "x", "–");
  minimize.setAttribute("aria-label", "Minimize");
  head.append(el("span", "", config.h), minimize);
  box.append(head);
  if (config.pv) box.append(el("p", "pv", "Preview: only you can see this."));
  box.append(cardLink(card, ctx.href(card, "badge")), via(config.a, api));

  const tab = el("button", "tab");
  tab.setAttribute("aria-label", `Show ${config.h.toLowerCase()}`);
  tab.append(logo(card), el("span", "", "Recommended"));

  wrap.append(box, tab);
  root.append(style, wrap);
  document.body.append(host);

  const phone = matchMedia("(max-width: 640px)").matches;
  const minimizedAt = Number(load(minKey)) || 0;
  let open = !phone && Date.now() - minimizedAt > MINIMIZE_MS;
  let ready = false;
  let bandOnScreen = false;

  const show = (asOpen: boolean) => {
    box.hidden = !asOpen;
    tab.hidden = asOpen;
  };
  const update = () => {
    if (!ready || bandOnScreen) {
      host.style.display = "none";
      return;
    }
    host.style.display = "block";
    show(open);
    const overBox = open && blocker(box, host);
    if (overBox) show(false);
    const overTab = !tab.hidden && blocker(tab, host);
    if (overTab) host.style.display = "none";
    // The owner preview says why the badge stepped aside (visitors never see this).
    const reason = overTab || overBox;
    if (config.pv && reason) console.info("Backscratch: the corner badge is making room for", reason);
  };

  minimize.onclick = () => {
    open = false;
    save(minKey, String(Date.now()));
    update();
  };
  tab.onclick = () => {
    open = true;
    save(minKey, "0");
    update();
  };

  // Appear after a short delay or a little scrolling, whichever comes first.
  const reveal = () => {
    ready = true;
    update();
  };
  setTimeout(reveal, DELAY_MS);
  let pending = false;
  const recheck = () => {
    if (!ready && scrollY > SCROLL_PX) reveal();
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      update();
    }, 250);
  };
  addEventListener("scroll", recheck, { passive: true });
  addEventListener("resize", recheck, { passive: true });

  // (Not in the owner preview, which shows both placements side by side.)
  if (band && !config.pv && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      bandOnScreen = entry.isIntersecting;
      update();
    }).observe(band);
  }

  // Only the open card counts as a view; the minimized tab never does.
  if (!config.pv) watchViews(box, () => ctx.view([card.s], "badge"));
}
