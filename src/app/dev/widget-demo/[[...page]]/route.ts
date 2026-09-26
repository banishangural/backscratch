import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Development only: a plain HTML "founder site" that embeds the widget exactly like a real one
// would, so the band, the badge, the heartbeat, views and clicks can be tested locally.
// localhost counts as every product's own domain in development (see isProductHost).
// It has several pages (for the distinct-pages go-live check) and an optional fixed "chat"
// button (?chat=1) to check that the badge gets out of its way. 404 in production.

const PAGES = ["", "pricing", "blog", "blog/2024/10", "docs/getting-started"];

export async function GET(request: NextRequest, ctx: RouteContext<"/dev/widget-demo/[[...page]]">) {
  if (env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });

  const { page = [] } = await ctx.params;
  const params = request.nextUrl.searchParams;
  const slots = await db.slot.findMany({
    select: { id: true, product: { select: { name: true, status: true, offersBadge: true } } },
    orderBy: { product: { name: "asc" } },
  });
  const selected = params.get("slot") ?? slots[0]?.id ?? "";
  const chat = params.get("chat") === "1";
  const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const query = (extra: Record<string, string>) => `?${new URLSearchParams({ slot: selected, ...(chat && { chat: "1" }), ...extra })}`;

  const products = slots
    .map((s) => {
      const label = `${s.product.name} (${s.product.status.toLowerCase()}${s.product.offersBadge ? ", offers badge" : ""})`;
      return `<li><a href="?slot=${s.id}">${escape(label)}</a>${s.id === selected ? " ◀" : ""}</li>`;
    })
    .join("");
  const nav = PAGES.map((p) => `<a href="/dev/widget-demo/${p}${query({})}">/${p}</a>`).join(" · ");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Widget demo host page</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  /* Deliberately aggressive host CSS: the widget's Shadow DOM should ignore all of it. */
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 16px;color:#333}
  * { color: purple !important; font-size: 20px; }
  a { text-decoration: underline wavy; }
  .spacer{height:120vh;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center}
  footer{background:#eee;padding:24px;margin-top:0}
  /* A page-sized fixed background, as many real sites have: the badge must still show. */
  .bg{position:fixed;inset:0;z-index:-1;background:linear-gradient(#fdfcff,#f3f0ff)}
  .chat{position:fixed;right:16px;bottom:16px;width:56px;height:56px;border-radius:50%;background:#2563eb;border:0}
</style></head>
<body>
  <div class="bg"></div>
  <h1>Pretend founder site: /${escape(page.join("/"))}</h1>
  <p>Pages: ${nav}</p>
  <p>Pick a product. Scroll down to the band and keep it on screen for a second to count a view.
  The corner badge appears after 3 seconds or a little scrolling if the product offers it.
  <a href="${query({ chat: chat ? "0" : "1" })}">${chat ? "Remove" : "Add"} a fixed chat button</a>.</p>
  <ul>${products}</ul>
  <div class="spacer">Scroll down ↓</div>
  <script src="/w.js" data-slot="${escape(selected)}" async></script>
  <footer>Site footer · © Pretend founder</footer>
  ${chat ? '<button class="chat" aria-label="Chat"></button>' : ""}
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
