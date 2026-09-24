import { ProductForm } from "@/components/product-form";
import { createProduct } from "@/lib/products/actions";
import { requireUser } from "@/lib/session";

export default async function NewProductPage() {
  await requireUser();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Add a product</h1>
      <ProductForm action={createProduct} initial={{ showSwapStats: "on" }} submitLabel="Save and continue" />
    </main>
  );
}
