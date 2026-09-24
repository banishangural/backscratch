import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const products = await db.product.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, domain: true, status: true, statusReason: true, verifiedDomain: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your products</h1>
        <Link href="/products/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Add a product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No products yet. Add your first one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="flex flex-col gap-1 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.name}</span>
                  <StatusBadge status={p.status} />
                  {p.verifiedDomain !== p.domain && <span className="text-xs text-zinc-500">Domain not verified</span>}
                </div>
                <span className="text-sm text-zinc-500">{p.domain}</span>
                {p.statusReason && <span className="text-sm text-red-600">Reason: {p.statusReason}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
