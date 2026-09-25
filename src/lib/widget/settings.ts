"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { notifyBadgeChange } from "@/lib/widget/badge-notifications";
import { widgetSettingsInput, type WidgetSettingsState } from "./settings-schema";

// Founder-side widget settings: band theme and layout, and whether the product offers the
// corner badge (and in which corner). Re-checks the session and product ownership.

const productId = z.string().min(1).max(50);

export async function updateWidgetSettings(
  id: string,
  _prev: WidgetSettingsState,
  formData: FormData,
): Promise<WidgetSettingsState> {
  const user = await requireUser();
  const parsedId = productId.safeParse(id);
  const product = parsedId.success
    ? await db.product.findFirst({
        where: { id: parsedId.data, ownerId: user.id },
        select: { id: true, offersBadge: true, slot: { select: { id: true } } },
      })
    : null;
  if (!product?.slot) return { error: "Product not found." };

  const parsed = widgetSettingsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { theme, layout, offersBadge, badgeCorner } = parsed.data;

  await db.$transaction([
    db.slot.update({ where: { id: product.slot.id }, data: { theme, layout } }),
    db.product.update({ where: { id: product.id }, data: { offersBadge, badgeCorner } }),
  ]);
  if (offersBadge !== product.offersBadge) {
    after(() => notifyBadgeChange(product.id, offersBadge).catch((error) => console.error("Badge notification failed:", error)));
  }
  revalidatePath(`/products/${product.id}`);
  return { ok: true };
}
