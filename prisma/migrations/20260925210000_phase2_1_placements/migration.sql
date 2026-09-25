-- Phase 2.1: placement rework. One widget install (Slot) per product, a required footer band
-- plus an optional corner badge, and placement + page path on views and clicks.
-- Wrapped in a transaction: it moves data, so it must apply completely or not at all.
BEGIN;

-- CreateEnum
CREATE TYPE "Placement" AS ENUM ('BAND', 'BADGE');
CREATE TYPE "BadgeCorner" AS ENUM ('LEFT', 'RIGHT');

-- WidgetLayout gains ROW. Recreated rather than ADD VALUE, because a value added in this
-- transaction can't be used below. Existing CARD becomes ROW: the old "card" layout already
-- showed cards side by side, which is what ROW is now.
ALTER TYPE "WidgetLayout" RENAME TO "WidgetLayout_old";
CREATE TYPE "WidgetLayout" AS ENUM ('COMPACT', 'CARD', 'ROW');
ALTER TABLE "Slot" ALTER COLUMN "layout" DROP DEFAULT;
ALTER TABLE "Slot" ALTER COLUMN "layout" TYPE "WidgetLayout"
  USING (CASE WHEN "layout"::text = 'CARD' THEN 'ROW' ELSE "layout"::text END)::"WidgetLayout";
ALTER TABLE "Slot" ALTER COLUMN "layout" SET DEFAULT 'ROW';
DROP TYPE "WidgetLayout_old";

-- Product: placements offered
ALTER TABLE "Product" ADD COLUMN "badgeCorner" "BadgeCorner" NOT NULL DEFAULT 'RIGHT',
ADD COLUMN "offersBadge" BOOLEAN NOT NULL DEFAULT false;

-- One slot per product: keep the oldest active slot (its install code keeps working),
-- falling back to the oldest archived one. Events from the other slots move to it.
CREATE TEMP TABLE "_KeptSlot" AS
SELECT DISTINCT ON ("productId") "productId", "id"
FROM "Slot"
ORDER BY "productId", ("archivedAt" IS NOT NULL), "createdAt", "id";

UPDATE "Event" e SET "slotId" = k."id"
FROM "Slot" s JOIN "_KeptSlot" k ON k."productId" = s."productId"
WHERE e."slotId" = s."id" AND s."id" <> k."id";

DELETE FROM "Slot" s WHERE NOT EXISTS (SELECT 1 FROM "_KeptSlot" k WHERE k."id" = s."id");
DROP TABLE "_KeptSlot";

-- Slot: per-placement heartbeat. The old last-seen values become the band's. bandSpreadAt starts
-- at the old last-seen time so products that are live now stay live while page data builds up.
DROP INDEX "Slot_lastSeenAt_idx";
DROP INDEX "Slot_productId_idx";
ALTER TABLE "Slot" RENAME COLUMN "lastSeenAt" TO "bandLastSeenAt";
ALTER TABLE "Slot" RENAME COLUMN "lastSeenHost" TO "bandLastSeenHost";
ALTER TABLE "Slot" DROP COLUMN "archivedAt",
DROP COLUMN "name",
ADD COLUMN "bandSpreadAt" TIMESTAMP(3),
ADD COLUMN "badgeLastSeenAt" TIMESTAMP(3),
ADD COLUMN "badgeLastSeenHost" TEXT;
UPDATE "Slot" SET "bandSpreadAt" = "bandLastSeenAt";

-- Products without a slot get one. Ids match the public id format (lowercase alphanumeric).
INSERT INTO "Slot" ("id", "productId", "theme", "layout", "createdAt")
SELECT 'c' || substr(md5(random()::text || p."id"), 1, 24), p."id", 'AUTO', 'ROW', CURRENT_TIMESTAMP
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "Slot" s WHERE s."productId" = p."id");

CREATE UNIQUE INDEX "Slot_productId_key" ON "Slot"("productId");
CREATE INDEX "Slot_bandSpreadAt_idx" ON "Slot"("bandSpreadAt");
CREATE INDEX "Slot_badgeLastSeenAt_idx" ON "Slot"("badgeLastSeenAt");

-- PlacementPage: where each placement has loaded recently
CREATE TABLE "PlacementPage" (
    "slotId" TEXT NOT NULL,
    "placement" "Placement" NOT NULL,
    "path" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementPage_pkey" PRIMARY KEY ("slotId","placement","path")
);
CREATE INDEX "PlacementPage_slotId_placement_lastSeenAt_idx" ON "PlacementPage"("slotId", "placement", "lastSeenAt");
ALTER TABLE "PlacementPage" ADD CONSTRAINT "PlacementPage_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Event: placement and page path. Everything recorded so far came from the band.
ALTER TABLE "Event" ADD COLUMN "pagePath" TEXT,
ADD COLUMN "placement" "Placement";
UPDATE "Event" SET "placement" = 'BAND' WHERE "type" IN ('VIEW', 'CLICK');
CREATE INDEX "Event_sourceProductId_type_createdAt_idx" ON "Event"("sourceProductId", "type", "createdAt");

COMMIT;
