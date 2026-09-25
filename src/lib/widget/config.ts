import "server-only";
import { MAX_WIDGET_CARDS, PREVIEW_CARDS, WIDGET_HEADING } from "@/config/widget";
import type { WidgetLayout, WidgetTheme } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// What /api/widget/[slotId] returns. Short keys keep the widget bundle small.
// Links are built by the widget from our own origin: /r/<swapId>/<slotId>.
export type WidgetCard = { s: string; n: string; p: string; i: string | null };
export type WidgetConfig = {
  h: string; // heading
  a: string; // app name, for the "via" link
  t: "light" | "dark" | "auto";
  l: "compact" | "card";
  c: WidgetCard[];
  pv?: 1; // preview: sample cards, nothing is tracked
};

const THEMES: Record<WidgetTheme, WidgetConfig["t"]> = { LIGHT: "light", DARK: "dark", AUTO: "auto" };
const LAYOUTS: Record<WidgetLayout, WidgetConfig["l"]> = { COMPACT: "compact", CARD: "card" };

function baseConfig(slot: { theme: WidgetTheme; layout: WidgetLayout }): WidgetConfig {
  return { h: WIDGET_HEADING, a: env.APP_NAME, t: THEMES[slot.theme], l: LAYOUTS[slot.layout], c: [] };
}

async function findSlot(slotId: string) {
  return db.slot.findFirst({
    where: { id: slotId, archivedAt: null },
    select: { id: true, theme: true, layout: true, product: { select: { id: true, status: true } } },
  });
}

// Partner cards for a slot: the other side of each active swap, when both products are approved.
// More than MAX_WIDGET_CARDS partners rotate: a random pick per cache window.
export async function widgetConfig(slotId: string): Promise<WidgetConfig | null> {
  const slot = await findSlot(slotId);
  if (!slot) return null;
  const config = baseConfig(slot);
  if (slot.product.status !== "APPROVED") return config;

  const productId = slot.product.id;
  const partner = { select: { id: true, name: true, pitch: true, logoUrl: true, status: true } };
  const swaps = await db.swap.findMany({
    where: { status: "ACTIVE", OR: [{ productAId: productId }, { productBId: productId }] },
    select: { id: true, productAId: true, productA: partner, productB: partner },
  });

  const cards = swaps
    .map((swap) => ({ swap, other: swap.productAId === productId ? swap.productB : swap.productA }))
    .filter(({ other }) => other.status === "APPROVED")
    .map(({ swap, other }) => ({ s: swap.id, n: other.name, p: other.pitch, i: other.logoUrl }));

  config.c = shuffle(cards).slice(0, MAX_WIDGET_CARDS);
  return config;
}

// Owner preview: the slot's real theme and layout with sample cards.
export async function previewConfig(slotId: string): Promise<WidgetConfig | null> {
  const slot = await findSlot(slotId);
  if (!slot) return null;
  const cards = PREVIEW_CARDS.map((card, index) => ({ s: `preview${index}`, n: card.name, p: card.pitch, i: null }));
  return { ...baseConfig(slot), c: cards, pv: 1 };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
