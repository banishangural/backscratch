import type { Card } from "./types";

// Building blocks shared by the band and the badge. All founder-supplied text goes through
// textContent (never innerHTML), and links always point at our own /r/ redirect.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function letter(name: string) {
  return el("span", "l", name.charAt(0).toUpperCase());
}

export function logo(card: Card) {
  if (!card.i || !/^https:\/\//.test(card.i)) return letter(card.n);
  const img = el("img", "l");
  img.src = card.i;
  img.alt = "";
  img.width = img.height = 36;
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => img.replaceWith(letter(card.n));
  return img;
}

export function cardLink(card: Card, href: string | null) {
  const link = el("a", "c");
  if (href) {
    link.href = href;
    link.target = "_blank";
    link.rel = "sponsored noopener";
  }
  const text = el("span", "t");
  text.append(el("span", "n", card.n), el("span", "p", card.p));
  link.append(logo(card), text);
  return link;
}

export function via(appName: string, api: string) {
  const wrap = el("span", "v");
  const link = el("a", "", `via ${appName}`);
  link.href = api;
  link.target = "_blank";
  link.rel = "noopener";
  wrap.append(link);
  return wrap;
}

// Counts a view once at least half of the element has been visible for one second.
export function watchViews(node: HTMLElement, onView: () => void) {
  if (!("IntersectionObserver" in window) || navigator.webdriver) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new IntersectionObserver(
    ([entry]) => {
      clearTimeout(timer);
      if (entry.intersectionRatio < 0.5) return;
      timer = setTimeout(() => {
        observer.disconnect();
        onView();
      }, 1000);
    },
    { threshold: [0, 0.5] },
  );
  observer.observe(node);
}
