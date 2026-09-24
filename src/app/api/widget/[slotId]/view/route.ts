import { z } from "zod";
import { MAX_WIDGET_CARDS } from "@/config/widget";
import { db } from "@/lib/db";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { isProductHost } from "@/lib/widget/go-live";
import { accepted, pageHost, publicId, readJsonBody } from "@/lib/widget/request";
import { isBot, utcDay, visitorHash } from "@/lib/widget/visitor";

// Viewable impression: the widget sends this once at least half of it has been on screen
// for a second. One VIEW per swap shown, deduped per visitor, slot, swap, and day.
// The swap ids come from the browser, so each one is checked against the database.

const body = z.object({ s: z.array(publicId).min(1).max(MAX_WIDGET_CARDS), h: z.string().max(253).optional() });

export async function POST(request: Request, ctx: RouteContext<"/api/widget/[slotId]/view">) {
  const { slotId } = await ctx.params;
  if (!publicId.safeParse(slotId).success || isBot(request)) return accepted();
  if (!(await rateLimit(`widget-view:${await clientIpHash()}`, 60, 60))) return accepted();

  const data = await readJsonBody(request, body);
  if (!data) return accepted();

  const slot = await db.slot.findFirst({
    where: { id: slotId, archivedAt: null, product: { status: "APPROVED" } },
    select: { productId: true, product: { select: { verifiedDomain: true } } },
  });
  // Views only count on the product's own site, so a slot can't be inflated elsewhere.
  const host = pageHost(request, data.h);
  if (!slot || !host || !isProductHost(host, slot.product.verifiedDomain)) return accepted();

  const source = slot.productId;
  const swaps = await db.swap.findMany({
    where: {
      id: { in: data.s },
      status: "ACTIVE",
      OR: [{ productAId: source }, { productBId: source }],
    },
    select: { id: true, productAId: true, productBId: true },
  });
  if (swaps.length === 0) return accepted();

  const hash = await visitorHash(request, slotId);
  const day = utcDay();
  await db.event.createMany({
    data: swaps.map((swap) => ({
      type: "VIEW" as const,
      swapId: swap.id,
      slotId,
      sourceProductId: source,
      destinationProductId: swap.productAId === source ? swap.productBId : swap.productAId,
      visitorHash: hash,
      dedupeKey: `v:${slotId}:${swap.id}:${hash}:${day}`,
    })),
    skipDuplicates: true,
  });
  return accepted();
}
