import { z } from "zod";
import { HEARTBEAT_WRITE_INTERVAL_MINUTES } from "@/config/widget";
import { db } from "@/lib/db";
import { clientIpHash, rateLimit } from "@/lib/rate-limit";
import { isProductHost, markListedIfLive } from "@/lib/widget/go-live";
import { accepted, pageHost, publicId, readJsonBody } from "@/lib/widget/request";

// Heartbeat, sent on every widget load. Updates the slot's last-seen time when the widget
// runs on the product's own domain (see isProductHost), which is what makes a product live.

const body = z.object({ h: z.string().max(253).optional() });

export async function POST(request: Request, ctx: RouteContext<"/api/widget/[slotId]/load">) {
  const { slotId } = await ctx.params;
  if (!publicId.safeParse(slotId).success) return accepted();
  if (!(await rateLimit(`widget-load:${await clientIpHash()}`, 60, 60))) return accepted();

  const data = await readJsonBody(request, body);
  const host = pageHost(request, data?.h);
  if (!host) return accepted();

  const slot = await db.slot.findFirst({
    where: { id: slotId, archivedAt: null },
    select: { productId: true, product: { select: { verifiedDomain: true } } },
  });
  if (!slot || !isProductHost(host, slot.product.verifiedDomain)) return accepted();

  // Only write when the last heartbeat is old or came from another host.
  const now = new Date();
  const staleBefore = new Date(now.getTime() - HEARTBEAT_WRITE_INTERVAL_MINUTES * 60 * 1000);
  const { count } = await db.slot.updateMany({
    where: {
      id: slotId,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: staleBefore } }, { NOT: { lastSeenHost: host } }],
    },
    data: { lastSeenAt: now, lastSeenHost: host },
  });
  if (count > 0) await markListedIfLive(slot.productId);
  return accepted();
}
