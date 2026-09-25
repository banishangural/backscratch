import "server-only";
import { MAX_BADGE_CARDS, MAX_WIDGET_CARDS, PREVIEW_CARDS, WIDGET_HEADING } from "@/config/widget";
import type { BadgeCorner, WidgetLayout, WidgetTheme } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { liveSince } from "@/lib/widget/go-live";
import { badgeLive, badgeSelect } from "@/lib/widget/placements";

// What /api/widget/[slotId] returns. Short keys keep the widget bundle small.
// Links are built by the widget from our own origin: /r/<swapId>/<slotId>.
export type WidgetCard = { s: string; n: string; p: string; i: string | null };
export type WidgetConfig = {
  h: string; // heading
  a: string; // app name, for the "via" link
  t: "light" | "dark" | "auto";
  l: "compact" | "card" | "row"; // band layout
  c: WidgetCard[]; // band cards (up to MAX_WIDGET_CARDS)
  // Corner badge, present whenever the product offers it (even with no cards, so the
  // heartbeat can report it). k = corner; c = partners to rotate through, one per page view.
  b?: { k: "l" | "r"; c: WidgetCard[] };
  pv?: 1; // preview: sample cards, nothing is tracked
};

const THEMES: Record<WidgetTheme, WidgetConfig["t"]> = { LIGHT: "light", DARK: "dark", AUTO: "auto" };
const LAYOUTS: Record<WidgetLayout, WidgetConfig["l"]> = { COMPACT: "compact", CARD: "card", ROW: "row" };
const CORNERS: Record<BadgeCorner, "l" | "r"> = { LEFT: "l", RIGHT: "r" };

type SlotSettings = {
  theme: WidgetTheme;
  layout: WidgetLayout;
  product: { offersBadge: boolean; badgeCorner: BadgeCorner };
};

function baseConfig(slot: SlotSettings): WidgetConfig {
  const config: WidgetConfig = { h: WIDGET_HEADING, a: env.APP_NAME, t: THEMES[slot.theme], l: LAYOUTS[slot.layout], c: [] };
  if (slot.product.offersBadge) config.b = { k: CORNERS[slot.product.badgeCorner], c: [] };
  return config;
}

async function findSlot(slotId: string) {
  return db.slot.findUnique({
    where: { id: slotId },
    select: {
      theme: true,
      layout: true,
      product: { select: { id: true, status: true, offersBadge: true, badgeCorner: true } },
    },
  });
}

// Partner cards: the other side of each active swap, when both products are approved.
// Every swap runs on the band. The badge shows a partner only if that partner's badge is live
// too (both sides offer it); the product's own badge is loading right now, so it counts.
// More than MAX_WIDGET_CARDS band partners rotate: a random pick per cache window.
export async function widgetConfig(slotId: string): Promise<WidgetConfig | null> {
  const slot = await findSlot(slotId);
  if (!slot) return null;
  const config = baseConfig(slot);
  if (slot.product.status !== "APPROVED") return config;

  const productId = slot.product.id;
  const partner = { select: { id: true, name: true, pitch: true, logoUrl: true, status: true, ...badgeSelect } };
  const swaps = await db.swap.findMany({
    where: { status: "ACTIVE", OR: [{ productAId: productId }, { productBId: productId }] },
    select: { id: true, productAId: true, productA: partner, productB: partner },
  });

  const partners = swaps
    .map((swap) => ({ swap, other: swap.productAId === productId ? swap.productB : swap.productA }))
    .filter(({ other }) => other.status === "APPROVED");
  const card = ({ swap, other }: (typeof partners)[number]): WidgetCard => ({ s: swap.id, n: other.name, p: other.pitch, i: other.logoUrl });

  config.c = shuffle(partners).slice(0, MAX_WIDGET_CARDS).map(card);
  if (config.b) {
    const since = liveSince();
    config.b.c = shuffle(partners.filter(({ other }) => badgeLive(other, since))).slice(0, MAX_BADGE_CARDS).map(card);
  }
  return config;
}

// Owner preview: the real theme, layout and corner with sample cards. Always includes the
// badge, so founders can see it before they offer it.
export async function previewConfig(slotId: string): Promise<WidgetConfig | null> {
  const slot = await findSlot(slotId);
  if (!slot) return null;
  const cards = PREVIEW_CARDS.map((card, index) => ({ s: `preview${index}`, n: card.name, p: card.pitch, i: null }));
  return { ...baseConfig(slot), c: cards, b: { k: CORNERS[slot.product.badgeCorner], c: cards }, pv: 1 };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
