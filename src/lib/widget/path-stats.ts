import "server-only";
import type { Placement } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Where a product's widget views happen, by placement and page path (from our own events).

export const PATH_STATS_DAYS = 30;
const TOP_PATHS = 5;

export type PathShare = { path: string; views: number; share: number };
export type PathBreakdown = Record<Placement, { total: number; paths: PathShare[] }>;

export async function viewPathBreakdown(productId: string): Promise<PathBreakdown> {
  const rows = await db.event.groupBy({
    by: ["placement", "pagePath"],
    where: {
      sourceProductId: productId,
      type: "VIEW",
      placement: { not: null },
      createdAt: { gte: new Date(Date.now() - PATH_STATS_DAYS * 24 * 60 * 60 * 1000) },
    },
    _count: { _all: true },
  });

  const result: PathBreakdown = { BAND: { total: 0, paths: [] }, BADGE: { total: 0, paths: [] } };
  for (const placement of ["BAND", "BADGE"] as const) {
    const counts = rows
      .filter((row) => row.placement === placement)
      .map((row) => ({ path: row.pagePath ?? "(unknown)", views: row._count._all }))
      .sort((a, b) => b.views - a.views);
    const total = counts.reduce((sum, row) => sum + row.views, 0);
    const top = counts.slice(0, TOP_PATHS);
    const rest = total - top.reduce((sum, row) => sum + row.views, 0);
    if (rest > 0) top.push({ path: "Other pages", views: rest });
    result[placement] = { total, paths: top.map((row) => ({ ...row, share: row.views / total })) };
  }
  return result;
}
