import "server-only";
import { LIVE_WINDOW_HOURS } from "@/config/widget";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// The marketplace listing rule (Phases 2–5): admin-approved, domain verified, and the widget
// seen on the product's own site within the last 72 hours. Phase 6 adds a verified integration.

export function liveSince() {
  return new Date(Date.now() - LIVE_WINDOW_HOURS * 60 * 60 * 1000);
}

// Use in queries, e.g. db.product.findMany({ where: liveProductWhere() }).
export function liveProductWhere(): Prisma.ProductWhereInput {
  return {
    status: "APPROVED",
    verifiedDomain: { not: null },
    slots: { some: { archivedAt: null, lastSeenAt: { gte: liveSince() } } },
  };
}

export type GoLiveChecks = { approved: boolean; verified: boolean; widgetSeen: boolean };

export function goLiveChecks(product: {
  status: string;
  domain: string;
  verifiedDomain: string | null;
  slots: { archivedAt: Date | null; lastSeenAt: Date | null }[];
}): GoLiveChecks {
  const since = liveSince();
  return {
    approved: product.status === "APPROVED",
    verified: product.verifiedDomain !== null && product.verifiedDomain === product.domain,
    widgetSeen: product.slots.some((s) => !s.archivedAt && s.lastSeenAt !== null && s.lastSeenAt >= since),
  };
}

// Does a widget load on this host count as "on the product's real site"?
// The verified domain and its subdomains count; localhost too, in development only.
export function isProductHost(host: string, verifiedDomain: string | null) {
  if (env.NODE_ENV === "development" && (host === "localhost" || host === "127.0.0.1")) return true;
  if (!verifiedDomain) return false;
  return host === verifiedDomain || host.endsWith(`.${verifiedDomain}`);
}

// Records a first go-live time once the rule is met. Unlisting is a query-time check
// (liveProductWhere), so a product drops out automatically when its widget disappears.
export async function markListedIfLive(productId: string) {
  await db.product.updateMany({
    where: { id: productId, listedAt: null, ...liveProductWhere() },
    data: { listedAt: new Date() },
  });
}
