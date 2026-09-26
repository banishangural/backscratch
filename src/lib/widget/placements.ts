import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Placement } from "@/generated/prisma/enums";
import { liveSince } from "@/lib/widget/go-live";

export { normalizePath } from "./path";

// Placements: the footer band (required, every swap runs on it) and the corner badge
// (optional). A swap runs on the badge only when both products offer it and both badges
// were seen within the live window; otherwise it falls back to the band.

// Short names the widget sends ("band" / "badge"). Anything else is treated as the band.
export function parsePlacement(value: unknown): Placement {
  return value === "badge" ? "BADGE" : "BAND";
}

type BadgeFields = { offersBadge: boolean; slot: { badgeLastSeenAt: Date | null } | null };

// Offers the badge and it loaded on the product's own site within the live window.
export function badgeLive(product: BadgeFields, since = liveSince()) {
  return product.offersBadge && product.slot?.badgeLastSeenAt != null && product.slot.badgeLastSeenAt >= since;
}

// Prisma select for badgeLive().
export const badgeSelect = { offersBadge: true, slot: { select: { badgeLastSeenAt: true } } } satisfies Prisma.ProductSelect;

// The placements a swap runs on right now.
export function swapPlacements(a: BadgeFields, b: BadgeFields): Placement[] {
  const since = liveSince();
  return badgeLive(a, since) && badgeLive(b, since) ? ["BAND", "BADGE"] : ["BAND"];
}

// For the founder: how many active swaps there are, and how many of those partners the badge
// can show right now (the partner offers the badge and it loaded within the live window).
export async function badgePartnerCounts(productId: string) {
  const partner = { select: { status: true, ...badgeSelect } };
  const swaps = await db.swap.findMany({
    where: { status: "ACTIVE", OR: [{ productAId: productId }, { productBId: productId }] },
    select: { productAId: true, productA: partner, productB: partner },
  });
  const partners = swaps
    .map((swap) => (swap.productAId === productId ? swap.productB : swap.productA))
    .filter((other) => other.status === "APPROVED");
  const since = liveSince();
  return { active: partners.length, onBadge: partners.filter((other) => badgeLive(other, since)).length };
}
