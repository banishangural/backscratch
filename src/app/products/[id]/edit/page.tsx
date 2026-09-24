import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { db } from "@/lib/db";
import { updateProduct } from "@/lib/products/actions";
import type { ProductFormValues } from "@/lib/products/schema";
import { requireUser } from "@/lib/session";

export default async function EditProductPage({ params }: PageProps<"/products/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const product = await db.product.findFirst({ where: { id, ownerId: user.id } });
  if (!product) notFound();

  const on = (value: boolean) => (value ? "on" : undefined);
  const initial: ProductFormValues = {
    name: product.name,
    url: product.url,
    logoUrl: product.logoUrl ?? "",
    pitch: product.pitch,
    category: product.category,
    audience: product.audience,
    showRevenue: on(product.showRevenue),
    showSubscriptions: on(product.showSubscriptions),
    showCustomers: on(product.showCustomers),
    showTraffic: on(product.showTraffic),
    showSwapStats: on(product.showSwapStats),
  };

  const note =
    product.status === "APPROVED"
      ? "Changing the name, URL, logo or pitch sends your product back for review. A new domain also needs verifying again."
      : "Changing the domain means verifying it again.";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Edit {product.name}</h1>
      <ProductForm action={updateProduct.bind(null, product.id)} initial={initial} submitLabel="Save changes" note={note} />
    </main>
  );
}
