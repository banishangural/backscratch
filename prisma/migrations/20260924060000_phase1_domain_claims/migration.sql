
-- DropIndex
DROP INDEX "Product_domain_key";

-- AlterTable
ALTER TABLE "DomainVerification" ALTER COLUMN "method" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "verifiedDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_verifiedDomain_key" ON "Product"("verifiedDomain");

-- CreateIndex
CREATE INDEX "Product_domain_idx" ON "Product"("domain");


-- Backfill: products that were already verified keep their claim on the domain.
UPDATE "Product" p
SET "verifiedDomain" = p."domain"
FROM "DomainVerification" v
WHERE v."productId" = p."id" AND v."verifiedAt" IS NOT NULL;
