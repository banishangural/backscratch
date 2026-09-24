"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type Product } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { checkOwnership, newVerificationToken } from "@/lib/verification";
import { productInput, readProductForm, type FormState, type ProductInput } from "./schema";

// Founder-side product mutations. Every action re-checks the session and ownership:
// server actions are public POST endpoints, whatever the UI shows.

const productId = z.string().min(1).max(50);

async function ownedProduct(id: unknown, userId: string) {
  const parsed = productId.safeParse(id);
  if (!parsed.success) return null;
  return db.product.findFirst({
    where: { id: parsed.data, ownerId: userId },
    include: { verification: true },
  });
}

async function domainClaimedByOther(domain: string, exceptProductId?: string) {
  const claim = await db.product.findUnique({ where: { verifiedDomain: domain }, select: { id: true } });
  return claim !== null && claim.id !== exceptProductId;
}

const CLAIMED = "This domain is already verified by another account. If it's yours, contact us.";

function invalid(formData: FormData, error: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values: readProductForm(formData) };
}

function productData(input: ProductInput) {
  return {
    name: input.name,
    url: input.url.url,
    domain: input.url.domain,
    logoUrl: input.logoUrl,
    pitch: input.pitch,
    category: input.category,
    audience: input.audience,
    showRevenue: input.showRevenue,
    showSubscriptions: input.showSubscriptions,
    showCustomers: input.showCustomers,
    showTraffic: input.showTraffic,
    showSwapStats: input.showSwapStats,
  };
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = productInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const { domain } = parsed.data.url;
  const values = readProductForm(formData);
  if (!(await rateLimit(`product-create:${user.id}`, 10, 24 * 60 * 60))) {
    return { error: "You've created a lot of products today. Try again tomorrow.", values };
  }
  if (await domainClaimedByOther(domain)) return { error: CLAIMED, values };
  const duplicate = await db.product.findFirst({ where: { ownerId: user.id, domain }, select: { id: true } });
  if (duplicate) return { error: "You already have a product for this domain.", values };

  const product = await db.product.create({
    data: {
      ...productData(parsed.data),
      ownerId: user.id,
      verification: { create: { token: newVerificationToken() } },
    },
  });
  redirect(`/products/${product.id}`);
}

// Edits to these fields change what partners' visitors see, so an approved product
// goes back to the review queue.
const REVIEWED_FIELDS = ["name", "url", "logoUrl", "pitch"] as const;

export async function updateProduct(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const product = await ownedProduct(id, user.id);
  if (!product) return { error: "Product not found." };

  const parsed = productInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);

  const data = productData(parsed.data);
  const domainChanged = data.domain !== product.domain;
  if (domainChanged && (await domainClaimedByOther(data.domain, product.id))) {
    return { error: CLAIMED, values: readProductForm(formData) };
  }
  const reviewedChanged = REVIEWED_FIELDS.some((field) => data[field] !== product[field]);

  await db.$transaction([
    db.product.update({
      where: { id: product.id },
      data: {
        ...data,
        ...statusAfterEdit(product, domainChanged, reviewedChanged),
        ...(domainChanged && { verifiedDomain: null }),
      },
    }),
    ...(domainChanged
      ? [
          db.domainVerification.update({
            where: { productId: product.id },
            data: { token: newVerificationToken(), method: null, verifiedAt: null, lastCheckedAt: null, lastError: null },
          }),
        ]
      : []),
  ]);
  redirect(`/products/${product.id}`);
}

function statusAfterEdit(product: Product, domainChanged: boolean, reviewedChanged: boolean) {
  const { status } = product;
  // Suspended and rejected products keep their status; rejected ones are resubmitted explicitly.
  if (status === "SUSPENDED" || status === "REJECTED" || status === "DRAFT") return {};
  // A new domain must be verified again before the product can be (re)submitted.
  if (domainChanged) return { status: "DRAFT" as const, statusReason: null, listedAt: null };
  if (status === "APPROVED" && reviewedChanged) {
    return { status: "PENDING" as const, statusReason: null, listedAt: null };
  }
  return {};
}

export type ActionResult = { ok: boolean; message: string };

export async function checkDomainNow(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const product = await ownedProduct(id, user.id);
  if (!product?.verification) return { ok: false, message: "Product not found." };
  if (product.verification.verifiedAt) return { ok: true, message: "Your domain is already verified." };

  if (!(await rateLimit(`verify:${product.id}`, 10, 10 * 60))) {
    return { ok: false, message: "Too many checks. Wait a few minutes and try again." };
  }
  if (await domainClaimedByOther(product.domain, product.id)) return { ok: false, message: CLAIMED };

  const result = await checkOwnership(product.domain, product.verification.token);
  const now = new Date();

  if (!result.ok) {
    const message = `Meta tag: ${result.meta}\nDNS TXT: ${result.dns}`;
    await db.domainVerification.update({
      where: { productId: product.id },
      data: { lastCheckedAt: now, lastError: message },
    });
    revalidatePath(`/products/${product.id}`);
    return { ok: false, message };
  }

  try {
    await db.$transaction([
      db.product.update({ where: { id: product.id }, data: { verifiedDomain: product.domain } }),
      db.domainVerification.update({
        where: { productId: product.id },
        data: { method: result.method, verifiedAt: now, lastCheckedAt: now, lastError: null },
      }),
    ]);
  } catch (error) {
    // Unique verifiedDomain: someone else verified this domain a moment ago.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: CLAIMED };
    }
    throw error;
  }
  revalidatePath(`/products/${product.id}`);
  return { ok: true, message: "Verified! You can now submit your product for review." };
}

export async function submitForReview(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const product = await ownedProduct(id, user.id);
  if (!product) return { ok: false, message: "Product not found." };
  if (product.status !== "DRAFT" && product.status !== "REJECTED") {
    return { ok: false, message: "This product isn't waiting to be submitted." };
  }
  if (!product.verification?.verifiedAt || product.verifiedDomain !== product.domain) {
    return { ok: false, message: "Verify your domain first." };
  }

  await db.product.update({
    where: { id: product.id },
    data: { status: "PENDING", statusReason: null },
  });
  revalidatePath(`/products/${product.id}`);
  return { ok: true, message: "Submitted. We'll review it soon." };
}
