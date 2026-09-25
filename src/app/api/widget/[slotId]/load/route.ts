import { z } from "zod";
import { db } from "@/lib/db";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { isProductHost, markListedIfLive } from "@/lib/widget/go-live";
import { recordBadgeSighting, recordBandSighting } from "@/lib/widget/heartbeat";
import { normalizePath } from "@/lib/widget/placements";
import { accepted, pageHost, publicId, readJsonBody } from "@/lib/widget/request";

// Heartbeat, sent on every widget load once the config has arrived. Records which placements
// loaded on which page, when the widget runs on the product's own domain (see isProductHost).
// The band seen on enough distinct pages is what makes a product live.

const body = z.object({
  h: z.string().max(253).optional(), // host
  p: z.string().max(2000).optional(), // page path
  pl: z.array(z.enum(["band", "badge"])).max(2).optional(), // placements rendered
});

export async function POST(request: Request, ctx: RouteContext<"/api/widget/[slotId]/load">) {
  const { slotId } = await ctx.params;
  if (!publicId.safeParse(slotId).success) return accepted();
  if (!(await rateLimit(`widget-load:${await clientIpHash()}`, 60, 60))) return accepted();

  const data = await readJsonBody(request, body);
  const host = pageHost(request, data?.h);
  if (!data || !host) return accepted();

  const slot = await db.slot.findUnique({
    where: { id: slotId },
    select: { productId: true, product: { select: { verifiedDomain: true, offersBadge: true } } },
  });
  if (!slot || !isProductHost(host, slot.product.verifiedDomain)) return accepted();

  const sighting = { slotId, host, path: normalizePath(data.p) };
  const placements = data.pl ?? ["band"];
  if (placements.includes("band") && (await recordBandSighting({ ...sighting, placement: "BAND" }))) {
    await markListedIfLive(slot.productId);
  }
  // The badge only counts while the product offers it.
  if (placements.includes("badge") && slot.product.offersBadge) {
    await recordBadgeSighting({ ...sighting, placement: "BADGE" });
  }
  return accepted();
}
