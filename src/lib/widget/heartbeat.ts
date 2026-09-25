import "server-only";
import {
  HEARTBEAT_WRITE_INTERVAL_MINUTES,
  MAX_TRACKED_PATHS,
  MIN_BAND_PAGES,
  PAGE_PATH_RETENTION_DAYS,
} from "@/config/widget";
import type { Placement } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { liveSince } from "@/lib/widget/go-live";

// Heartbeat bookkeeping. Each widget load reports the placements it rendered on a page.
// Writes are throttled: a page's row is refreshed at most every few minutes.

type Sighting = { slotId: string; placement: Placement; path: string; host: string };

// Returns true when something was written (a new page, or a stale one refreshed).
async function touchPage({ slotId, placement, path, host }: Sighting, now: Date) {
  const key = { slotId_placement_path: { slotId, placement, path } };
  const page = await db.placementPage.findUnique({ where: key, select: { lastSeenAt: true, host: true } });
  const staleBefore = new Date(now.getTime() - HEARTBEAT_WRITE_INTERVAL_MINUTES * 60 * 1000);

  if (page) {
    if (page.lastSeenAt >= staleBefore && page.host === host) return false;
    await db.placementPage.update({ where: key, data: { lastSeenAt: now, host } });
    return true;
  }

  // New path: forget old ones first, and cap how many one slot can have.
  const forgetBefore = new Date(now.getTime() - PAGE_PATH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.placementPage.deleteMany({ where: { slotId, lastSeenAt: { lt: forgetBefore } } });
  if ((await db.placementPage.count({ where: { slotId, placement } })) >= MAX_TRACKED_PATHS) return false;
  await db.placementPage.createMany({ data: [{ slotId, placement, path, host, lastSeenAt: now }], skipDuplicates: true });
  return true;
}

// The band: also re-checks the distinct-pages rule for going live.
export async function recordBandSighting(sighting: Sighting) {
  const now = new Date();
  if (!(await touchPage(sighting, now))) return false;

  const pages = await db.placementPage.count({
    where: { slotId: sighting.slotId, placement: "BAND", lastSeenAt: { gte: liveSince() } },
  });
  await db.slot.update({
    where: { id: sighting.slotId },
    data: { bandLastSeenAt: now, bandLastSeenHost: sighting.host, ...(pages >= MIN_BAND_PAGES && { bandSpreadAt: now }) },
  });
  return true;
}

export async function recordBadgeSighting(sighting: Sighting) {
  const now = new Date();
  if (!(await touchPage(sighting, now))) return false;
  await db.slot.update({
    where: { id: sighting.slotId },
    data: { badgeLastSeenAt: now, badgeLastSeenHost: sighting.host },
  });
  return true;
}
