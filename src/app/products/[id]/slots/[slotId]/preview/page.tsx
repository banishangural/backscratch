import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createPreviewToken } from "@/lib/widget/preview-token";

// Owner-only preview of one placement with sample cards, on a light and a dark page,
// so founders can check the theme and layout before any swaps exist. Nothing is tracked.
export default async function SlotPreviewPage({ params }: PageProps<"/products/[id]/slots/[slotId]/preview">) {
  const user = await requireUser();
  const { id, slotId } = await params;
  const slot = await db.slot.findFirst({
    where: { id: slotId, productId: id, archivedAt: null, product: { ownerId: user.id } },
    select: { id: true, name: true, product: { select: { name: true } } },
  });
  if (!slot) notFound();
  const token = createPreviewToken(slot.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href={`/products/${id}`} className="text-sm hover:underline">← {slot.product.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold">Preview: {slot.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sample cards in this placement&apos;s theme and layout. On your site, visitors see your swap partners instead.
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 ring-1 ring-zinc-200">
        <p className="mb-4 text-xs text-zinc-500">On a light page</p>
        <div data-backscratch={slot.id} data-preview={token} />
      </div>
      <div className="rounded-lg bg-zinc-950 p-6">
        <p className="mb-4 text-xs text-zinc-400">On a dark page</p>
        <div data-backscratch={slot.id} data-preview={token} />
      </div>
      <Script src="/w.js" strategy="afterInteractive" />
    </main>
  );
}
