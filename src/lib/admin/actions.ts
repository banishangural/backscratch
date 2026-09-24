"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Admin moderation. Admins are the emails listed in ADMIN_EMAILS.

const input = z.object({
  productId: z.string().min(1).max(50),
  action: z.enum(["approve", "reject", "suspend", "unsuspend"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export type ModerationResult = { ok: boolean; message: string };

export async function moderateProduct(
  _prev: ModerationResult | null,
  formData: FormData,
): Promise<ModerationResult> {
  await requireAdmin();
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { productId, action, reason } = parsed.data;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { status: true, domain: true, verifiedDomain: true },
  });
  if (!product) return { ok: false, message: "Product not found." };
  const verified = product.verifiedDomain === product.domain;

  if ((action === "reject" || action === "suspend") && reason.length < 3) {
    return { ok: false, message: "Please give the founder a reason." };
  }

  let data;
  switch (action) {
    case "approve":
      if (product.status !== "PENDING") return { ok: false, message: "Only pending products can be approved." };
      if (!verified) return { ok: false, message: "The domain isn't verified." };
      data = { status: "APPROVED" as const, statusReason: null };
      break;
    case "reject":
      if (product.status !== "PENDING") return { ok: false, message: "Only pending products can be rejected." };
      data = { status: "REJECTED" as const, statusReason: reason, listedAt: null };
      break;
    case "suspend":
      if (product.status === "SUSPENDED") return { ok: false, message: "Already suspended." };
      data = { status: "SUSPENDED" as const, statusReason: reason, listedAt: null };
      break;
    case "unsuspend":
      if (product.status !== "SUSPENDED") return { ok: false, message: "This product isn't suspended." };
      // Back to approved only if ownership still holds; otherwise the founder re-verifies and resubmits.
      data = verified
        ? { status: "APPROVED" as const, statusReason: null }
        : { status: "DRAFT" as const, statusReason: null };
      break;
  }

  await db.product.update({ where: { id: productId }, data });
  revalidatePath("/admin");
  return { ok: true, message: "Saved." };
}
