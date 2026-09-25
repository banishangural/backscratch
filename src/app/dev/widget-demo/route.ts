import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Development only: a plain HTML page that embeds the widget exactly like a founder's site
// would, so the widget, heartbeat, views and clicks can be tested locally. localhost counts
// as every product's own domain in development (see isProductHost). 404 in production.

export async function GET(request: NextRequest) {
  if (env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });

  const slots = await db.slot.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, product: { select: { name: true, status: true } } },
    orderBy: [{ product: { name: "asc" } }, { createdAt: "asc" }],
  });
  const selected = request.nextUrl.searchParams.get("slot") ?? slots[0]?.id ?? "";
  const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const options = slots
    .map((s) => `<li><a href="?slot=${s.id}">${escape(`${s.product.name} – ${s.name}`)}</a> <small>(${s.product.status.toLowerCase()})</small>${s.id === selected ? " ◀" : ""}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Widget demo host page</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  /* Deliberately aggressive host CSS: the widget's Shadow DOM should ignore all of it. */
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 16px;color:#333}
  * { color: purple !important; font-size: 20px; }
  a { text-decoration: underline wavy; }
  .spacer{height:120vh;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center}
</style></head>
<body>
  <h1>Pretend founder site</h1>
  <p>Pick a slot. Scroll down to the widget and keep it on screen for a second to count a view.</p>
  <ul>${options}</ul>
  <div class="spacer">Scroll down ↓</div>
  <p>The widget renders below this line.</p>
  <script src="/w.js" data-slot="${escape(selected)}" async></script>
  <p>Content after the widget.</p>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
