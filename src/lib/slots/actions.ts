"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_SLOTS_PER_PRODUCT } from "@/config/widget";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { slotInput, slotName, type SlotFormState } from "./schema";

// Founder-side widget placement mutations. Every action re-checks the session and that
// the slot's product belongs to the current user.

const id = z.string().min(1).max(50);

async function ownedSlot(slotId: unknown, userId: string) {
  const parsed = id.safeParse(slotId);
  if (!parsed.success) return null;
  return db.slot.findFirst({
    where: { id: parsed.data, archivedAt: null, product: { ownerId: userId } },
    select: { id: true, productId: true },
  });
}

function invalid(error: z.ZodError): SlotFormState {
  return { fieldErrors: z.flattenError(error).fieldErrors };
}

export async function createSlot(productId: string, _prev: SlotFormState, formData: FormData): Promise<SlotFormState> {
  const user = await requireUser();
  const parsedId = id.safeParse(productId);
  const product = parsedId.success
    ? await db.product.findFirst({ where: { id: parsedId.data, ownerId: user.id }, select: { id: true } })
    : null;
  if (!product) return { error: "Product not found." };

  const name = slotName.safeParse(formData.get("name"));
  if (!name.success) return { fieldErrors: { name: z.flattenError(name.error).formErrors } };

  const count = await db.slot.count({ where: { productId: product.id, archivedAt: null } });
  if (count >= MAX_SLOTS_PER_PRODUCT) return { error: `You can have up to ${MAX_SLOTS_PER_PRODUCT} placements.` };

  await db.slot.create({ data: { productId: product.id, name: name.data } });
  revalidatePath(`/products/${product.id}`);
  return { ok: true };
}

export async function updateSlot(slotId: string, _prev: SlotFormState, formData: FormData): Promise<SlotFormState> {
  const user = await requireUser();
  const slot = await ownedSlot(slotId, user.id);
  if (!slot) return { error: "Placement not found." };

  const parsed = slotInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  await db.slot.update({ where: { id: slot.id }, data: parsed.data });
  revalidatePath(`/products/${slot.productId}`);
  return { ok: true };
}

// Archived slots stop rendering (the config endpoint returns 404) but keep their events.
export async function archiveSlot(slotId: string): Promise<SlotFormState> {
  const user = await requireUser();
  const slot = await ownedSlot(slotId, user.id);
  if (!slot) return { error: "Placement not found." };

  await db.slot.update({ where: { id: slot.id }, data: { archivedAt: new Date() } });
  revalidatePath(`/products/${slot.productId}`);
  return { ok: true };
}
