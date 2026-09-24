import type { ProductStatus } from "@/generated/prisma/enums";

const STYLES: Record<ProductStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  PENDING: { label: "In review", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  SUSPENDED: { label: "Suspended", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const { label, className } = STYLES[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
