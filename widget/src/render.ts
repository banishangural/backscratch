import { CSS } from "./styles";
import type { Card, Config } from "./types";

// Builds the widget inside a closed Shadow DOM. All founder-supplied text goes through
// textContent (never innerHTML), and links always point at our own /r/ redirect.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function letter(name: string) {
  return el("span", "l", name.charAt(0).toUpperCase());
}

function logo(card: Card) {
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

function cardItem(card: Card, href: string | null) {
  const link = el("a", "c");
  if (href) {
    link.href = href;
    link.target = "_blank";
    link.rel = "sponsored noopener";
  }
  const text = el("span", "t");
  text.append(el("span", "n", card.n), el("span", "p", card.p));
  link.append(logo(card), text);
  const item = el("li");
  item.append(link);
  return item;
}

export function render(host: HTMLElement, config: Config, api: string, slot: string) {
  const root = host.attachShadow({ mode: "closed" });
  const style = el("style");
  style.textContent = CSS;

  const box = el("div", `w ${config.t} ${config.l}`);
  box.setAttribute("role", "complementary");
  box.setAttribute("aria-label", config.h);
  if (config.pv) box.append(el("p", "pv", "Preview: only you can see this. Visitors see your swap partners here."));
  box.append(el("h2", "", config.h));

  const list = el("ul");
  for (const card of config.c) {
    list.append(cardItem(card, config.pv ? null : `${api}/r/${card.s}/${slot}`));
  }
  box.append(list);

  const via = el("span", "v");
  const link = el("a", "", `via ${config.a}`);
  link.href = api;
  link.target = "_blank";
  link.rel = "noopener";
  via.append(link);
  box.append(via);

  root.append(style, box);
}
