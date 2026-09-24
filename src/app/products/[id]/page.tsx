import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/config/categories";
import { ProductLogo } from "@/components/product-logo";
import { StatusBadge } from "@/components/status-badge";
import { SubmitForReview } from "@/components/submit-for-review";
import { VerificationPanel } from "@/components/verification-panel";
import type { ProductStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { metaTagFor, txtRecordFor } from "@/lib/verification";

const STATUS_HELP: Record<ProductStatus, string> = {
  DRAFT: "Verify your domain, then submit your product for review.",
  PENDING: "We're reviewing your product. You'll see the result here.",
  APPROVED: "Approved. Your product goes live in the marketplace once the widget is installed on your site.",
  REJECTED: "Your product wasn't approved. Fix the issue below, then resubmit.",
  SUSPENDED: "Your product is suspended and hidden from the marketplace. Contact us if you think this is a mistake.",
};

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const product = await db.product.findFirst({
    where: { id, ownerId: user.id },
    include: { verification: true },
  });
  if (!product?.verification) notFound();

  const { verification } = product;
  const verified = Boolean(verification.verifiedAt) && product.verifiedDomain === product.domain;
  const claimedByOther =
    !verified &&
    (await db.product.count({ where: { verifiedDomain: product.domain, id: { not: product.id } } })) > 0;
  const canSubmit = product.status === "DRAFT" || product.status === "REJECTED";
  const category = CATEGORIES.find((c) => c.key === product.category)?.label ?? product.category;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex items-start gap-4">
        <ProductLogo src={product.logoUrl} name={product.name} size={56} />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">{product.pitch}</p>
          <p className="mt-1 text-sm text-zinc-500">
            <a href={product.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{product.domain}</a>
            {" · "}{category}
          </p>
        </div>
        <Link href={`/products/${product.id}/edit`} className="text-sm hover:underline">Edit</Link>
      </div>

      <Section title="Status">
        <p className="text-sm">{STATUS_HELP[product.status]}</p>
        {product.statusReason && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Reason: {product.statusReason}
          </p>
        )}
        {canSubmit && (
          <SubmitForReview
            productId={product.id}
            disabled={!verified}
            label={product.status === "REJECTED" ? "Resubmit for review" : "Submit for review"}
          />
        )}
      </Section>

      <Section title="Domain ownership">
        {verified ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            ✓ {product.domain} verified {verification.method === "DNS_TXT" ? "by DNS TXT record" : "by meta tag"} on{" "}
            {verification.verifiedAt!.toLocaleDateString()}. Keep the tag or record in place.
          </p>
        ) : claimedByOther ? (
          <p className="text-sm text-red-600">
            {product.domain} has already been verified by another account. If it&apos;s yours, contact us.
          </p>
        ) : (
          <VerificationPanel
            productId={product.id}
            domain={product.domain}
            metaTag={metaTagFor(verification.token)}
            txtRecord={txtRecordFor(verification.token)}
            lastError={verification.lastError}
            lastCheckedAt={verification.lastCheckedAt?.toISOString() ?? null}
          />
        )}
      </Section>

      <Section title="Profile">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">Audience</dt>
          <dd>{product.audience}</dd>
          <dt className="text-zinc-500">Website</dt>
          <dd className="break-all">{product.url}</dd>
        </dl>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
