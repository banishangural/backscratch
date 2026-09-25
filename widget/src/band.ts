import { cardLink, el, via, watchViews } from "./card";
import { BAND_CSS } from "./styles";
import type { Ctx } from "./types";

// The footer band: a full-width "Tools we recommend" strip with up to 3 partners.
export function renderBand(host: HTMLElement, ctx: Ctx, api: string) {
  const { config } = ctx;
  const root = host.attachShadow({ mode: "closed" });
  const style = el("style");
  style.textContent = BAND_CSS;

  const band = el("div", `w ${config.t} ${config.l}`);
  band.setAttribute("role", "complementary");
  band.setAttribute("aria-label", config.h);
  const inner = el("div", "in");
  if (config.pv) inner.append(el("p", "pv", "Preview: only you can see this. Visitors see your swap partners here."));
  inner.append(el("h2", "", config.h));

  const list = el("ul");
  for (const card of config.c) {
    const item = el("li");
    item.append(cardLink(card, ctx.href(card, "band")));
    list.append(item);
  }
  inner.append(list, via(config.a, api));
  band.append(inner);
  root.append(style, band);

  if (!config.pv) watchViews(band, () => ctx.view(config.c.map((c) => c.s), "band"));
}
