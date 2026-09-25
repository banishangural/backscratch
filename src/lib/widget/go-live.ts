import "server-only";
import { LIVE_WINDOW_HOURS } from "@/config/widget";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// The marketplace listing rule (Phases 2.1–2): admin-approved, domain verified, and the footer
// band seen on the product's own site, on at least MIN_BAND_PAGES distinct pages, within the
// last 72 hours. Phase 3 adds a connected traffic integration.

export function liveSince() {
  return new Date(Date.now() - LIVE_WINDOW_HOURS * 60 * 60 * 1000);
}

// Use in queries, e.g. db.product.findMany({ where: liveProductWhere() }).
// Slot.bandSpreadAt is set by the heartbeat whenever the distinct-pages check passes.
export function liveProductWhere(): Prisma.ProductWhereInput {
  return {
    status: "APPROVED",
    verifiedDomain: { not: null },
    slot: { bandSpreadAt: { gte: liveSince() } },
  };
}

export type GoLiveChecks = { approved: boolean; verified: boolean; bandSeen: boolean; bandSpread: boolean };

export function goLiveChecks(product: {
  status: string;
  domain: string;
  verifiedDomain: string | null;
  slot: { bandLastSeenAt: Date | null; bandSpreadAt: Date | null } | null;
}): GoLiveChecks {
  const since = liveSince();
  const recent = (date: Date | null | undefined) => date != null && date >= since;
  return {
    approved: product.status === "APPROVED",
    verified: product.verifiedDomain !== null && product.verifiedDomain === product.domain,
    bandSeen: recent(product.slot?.bandLastSeenAt),
    bandSpread: recent(product.slot?.bandSpreadAt),
  };
}

// Distinct pages the band loaded on within the live window.
export async function recentBandPages(slotId: string) {
  return db.placementPage.findMany({
    where: { slotId, placement: "BAND", lastSeenAt: { gte: liveSince() } },
    select: { path: true, host: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
  });
}

// Does a widget load on this host count as "on the product's real site"?
// The verified domain and its subdomains count; localhost too, in development only.
export function isProductHost(host: string, verifiedDomain: string | null) {
  if (env.NODE_ENV === "development" && (host === "localhost" || host === "127.0.0.1")) return true;
  if (!verifiedDomain) return false;
  return host === verifiedDomain || host.endsWith(`.${verifiedDomain}`);
}

// Records a first go-live time once the rule is met. Unlisting is a query-time check
// (liveProductWhere), so a product drops out automatically when its band disappears.
export async function markListedIfLive(productId: string) {
  await db.product.updateMany({
    where: { id: productId, listedAt: null, ...liveProductWhere() },
    data: { listedAt: new Date() },
  });
}
