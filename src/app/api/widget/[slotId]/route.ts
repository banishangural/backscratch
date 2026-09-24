import type { NextRequest } from "next/server";
import { WIDGET_CONFIG_CACHE_SECONDS } from "@/config/widget";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { previewConfig, widgetConfig } from "@/lib/widget/config";
import { isValidPreviewToken } from "@/lib/widget/preview-token";
import { CORS_HEADERS, NO_STORE, publicId } from "@/lib/widget/request";

// Public widget config for one slot. Cached by browsers and Vercel's CDN for a minute,
// so most widget loads never reach the database.
const CACHED = {
  "Cache-Control": `public, max-age=${WIDGET_CONFIG_CACHE_SECONDS}, s-maxage=${WIDGET_CONFIG_CACHE_SECONDS}, stale-while-revalidate=300`,
};

export async function GET(request: NextRequest, ctx: RouteContext<"/api/widget/[slotId]">) {
  const { slotId } = await ctx.params;
  if (!publicId.safeParse(slotId).success) return notFound();
  if (!(await rateLimit(`widget-config:${await clientIpHash()}`, 120, 60))) {
    return new Response(null, { status: 429, headers: { ...CORS_HEADERS, ...NO_STORE } });
  }

  const previewToken = request.nextUrl.searchParams.get("preview");
  if (previewToken !== null) {
    const config = isValidPreviewToken(slotId, previewToken) ? await previewConfig(slotId) : null;
    return config ? Response.json(config, { headers: { ...CORS_HEADERS, ...NO_STORE } }) : notFound();
  }

  const config = await widgetConfig(slotId);
  return config ? Response.json(config, { headers: { ...CORS_HEADERS, ...CACHED } }) : notFound();
}

// Unknown or archived slots: the widget renders nothing. Cached too, so a stale
// snippet on a busy page doesn't hit the database on every load.
function notFound() {
  return new Response(null, { status: 404, headers: { ...CORS_HEADERS, ...CACHED } });
}
