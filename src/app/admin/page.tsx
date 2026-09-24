import Link from "next/link";
import { AdminActions } from "@/components/admin-actions";
import { ProductLogo } from "@/components/product-logo";
import { StatusBadge } from "@/components/status-badge";
import { ProductStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const TABS = [ProductStatus.PENDING, ProductStatus.APPROVED, ProductStatus.REJECTED, ProductStatus.SUSPENDED, ProductStatus.DRAFT];

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const { status: requested } = await searchParams;
  const status = TABS.find((tab) => tab === requested) ?? ProductStatus.PENDING;

  const [counts, products] = await Promise.all([
    db.product.groupBy({ by: ["status"], _count: true }),
    db.product.findMany({
      where: { status },
      // Oldest first so the review queue is first-come, first-served.
      orderBy: { updatedAt: "asc" },
      take: 100,
      include: { owner: { select: { email: true } } },
    }),
  ]);
  const countFor = (s: ProductStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin: products</h1>

      <nav className="flex flex-wrap gap-2 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin?status=${tab}`}
            className={`rounded-full px-3 py-1 ${tab === status ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()} ({countFor(tab)})
          </Link>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing here.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {products.map((p) => {
            const verified = p.verifiedDomain === p.domain;
            return (
              <li key={p.id} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <ProductLogo src={p.logoUrl} name={p.name} size={40} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm">{p.pitch}</p>
                    <p className="text-xs text-zinc-500">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.url}</a>
                      {" · "}{p.category}{" · "}{p.owner.email}{" · "}
                      <span className={verified ? "text-emerald-600" : "text-red-600"}>{verified ? "domain verified" : "domain NOT verified"}</span>
                    </p>
                    <p className="text-xs text-zinc-500">Audience: {p.audience}</p>
                    {p.statusReason && <p className="text-xs text-red-600">Reason: {p.statusReason}</p>}
                  </div>
                </div>
                <AdminActions productId={p.id} status={p.status} verified={verified} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
