import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createPreviewToken } from "@/lib/widget/preview-token";

// Owner-only preview with sample cards: the footer band on a light and a dark page, and the
// corner badge in its real corner of this page. Nothing is tracked.
export default async function WidgetPreviewPage({ params }: PageProps<"/products/[id]/preview">) {
  const user = await requireUser();
  const { id } = await params;
  const product = await db.product.findFirst({
    where: { id, ownerId: user.id },
    select: { name: true, offersBadge: true, badgeCorner: true, slot: { select: { id: true } } },
  });
  if (!product?.slot) notFound();
  const token = createPreviewToken(product.slot.id);
  const corner = product.badgeCorner === "LEFT" ? "bottom-left" : "bottom-right";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href={`/products/${id}`} className="text-sm hover:underline">← {product.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold">Widget preview</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sample cards in your theme and layout. On your site, visitors see your swap partners instead. The corner badge
          appears in the {corner} corner of this page after a few seconds.
          {!product.offersBadge && " You don't offer the badge yet: tick “Corner badge” in your widget settings to add it."}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
        <p className="p-6 text-xs text-zinc-500">A light page. The band sits above the footer.</p>
        {/* The first container also renders the badge (one per page). */}
        <div data-backscratch={product.slot.id} data-preview={token} />
        <div className="bg-zinc-100 p-6 text-xs text-zinc-500">Your footer</div>
      </div>
      <div className="overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-zinc-800">
        <p className="p-6 text-xs text-zinc-400">A dark page.</p>
        <div data-backscratch={product.slot.id} data-preview={token} />
        <div className="bg-zinc-900 p-6 text-xs text-zinc-500">Your footer</div>
      </div>
      <Script src="/w.js" strategy="afterInteractive" />
    </main>
  );
}
