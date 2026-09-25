import { randomBytes } from "node:crypto";
import { CLICK_DEDUPE_SECONDS, CLICK_ID_PARAM, UTM_MEDIUM, UTM_SOURCE } from "@/config/widget";
import type { Placement } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { isProductHost } from "@/lib/widget/go-live";
import { badgeSelect, normalizePath, parsePlacement, swapPlacements } from "@/lib/widget/placements";
import { NO_STORE, publicId } from "@/lib/widget/request";
import { isBot, visitorHash } from "@/lib/widget/visitor";

// Click on a partner card. Records the click, then forwards the visitor to the partner with
// UTM parameters and a click id. The destination always comes from the database, never the URL.
// Visitors are always forwarded; bots, repeat clicks, and rate-limited clicks just aren't counted.
// The widget adds ?pl=band|badge&p=<page path>: browsers send only the origin as the Referer
// to other sites, so the path has to come from the widget. Both are labels, never counts.

export async function GET(request: Request, ctx: RouteContext<"/r/[swapId]/[slotId]">) {
  const { swapId, slotId } = await ctx.params;
  if (!publicId.safeParse(swapId).success || !publicId.safeParse(slotId).success) return go(env.APP_URL);

  const [swap, slot] = await Promise.all([
    db.swap.findUnique({
      where: { id: swapId },
      select: {
        status: true,
        productAId: true,
        productBId: true,
        productA: { select: { url: true, status: true, ...badgeSelect } },
        productB: { select: { url: true, status: true, ...badgeSelect } },
      },
    }),
    db.slot.findUnique({
      where: { id: slotId },
      select: { productId: true, product: { select: { verifiedDomain: true } } },
    }),
  ]);

  // The slot must belong to one side of the swap; the visitor goes to the other side.
  const source = slot?.productId;
  if (!swap || !slot || (source !== swap.productAId && source !== swap.productBId)) return go(env.APP_URL);
  const toB = source === swap.productAId;
  const destination = toB ? swap.productB : swap.productA;
  if (destination.status !== "APPROVED") return go(env.APP_URL);

  const target = new URL(destination.url);
  target.searchParams.set("utm_source", UTM_SOURCE);
  target.searchParams.set("utm_medium", UTM_MEDIUM);
  target.searchParams.set("utm_campaign", swapId);

  const { searchParams } = new URL(request.url);
  const placement = parsePlacement(searchParams.get("pl"));
  // Like views: a badge click counts only while the swap runs on the badge.
  const runsOn = swapPlacements(swap.productA, swap.productB).includes(placement);

  if (swap.status === "ACTIVE" && runsOn && (await countable(request, slot.product.verifiedDomain))) {
    const clickId = await recordClick(request, {
      swapId,
      slotId,
      placement,
      pagePath: normalizePath(searchParams.get("p")),
      sourceProductId: source,
      destinationProductId: toB ? swap.productBId : swap.productAId,
    });
    if (clickId) target.searchParams.set(CLICK_ID_PARAM, clickId);
  }
  return go(target.toString());
}

// Clicks from a page on another site (per the Referer, when the browser sends one) don't count.
async function countable(request: Request, verifiedDomain: string | null) {
  if (isBot(request)) return false;
  const referer = request.headers.get("referer");
  if (referer && URL.canParse(referer) && !isProductHost(new URL(referer).hostname, verifiedDomain)) return false;
  return rateLimit(`widget-click:${await clientIpHash()}`, 30, 60);
}

type ClickData = {
  swapId: string;
  slotId: string;
  placement: Placement;
  pagePath: string;
  sourceProductId: string;
  destinationProductId: string;
};

async function recordClick(request: Request, data: ClickData) {
  const hash = await visitorHash(request, data.slotId);
  const recent = await db.event.findFirst({
    where: {
      type: "CLICK",
      swapId: data.swapId,
      visitorHash: hash,
      createdAt: { gte: new Date(Date.now() - CLICK_DEDUPE_SECONDS * 1000) },
    },
    select: { clickId: true },
  });
  if (recent) return recent.clickId; // same visitor clicking again: reuse the click id

  const clickId = randomBytes(12).toString("base64url");
  await db.event.create({ data: { ...data, type: "CLICK", visitorHash: hash, clickId } });
  return clickId;
}

function go(url: string) {
  return new Response(null, { status: 302, headers: { Location: url, ...NO_STORE } });
}
