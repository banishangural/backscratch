-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('META_TAG', 'DNS_TXT');

-- CreateEnum
CREATE TYPE "WidgetTheme" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "WidgetLayout" AS ENUM ('COMPACT', 'CARD');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'PAUSED', 'ENDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PauseReason" AS ENUM ('MANUAL', 'HEARTBEAT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'CLICK', 'CONVERSION');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('STRIPE', 'TRUSTMRR', 'GA4', 'PLAUSIBLE', 'UMAMI');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "logoUrl" TEXT,
    "pitch" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "statusReason" TEXT,
    "listedAt" TIMESTAMP(3),
    "showRevenue" BOOLEAN NOT NULL DEFAULT false,
    "showSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "showCustomers" BOOLEAN NOT NULL DEFAULT false,
    "showTraffic" BOOLEAN NOT NULL DEFAULT false,
    "showSwapStats" BOOLEAN NOT NULL DEFAULT true,
    "exactRevenue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainVerification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "token" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" "WidgetTheme" NOT NULL DEFAULT 'AUTO',
    "layout" "WidgetLayout" NOT NULL DEFAULT 'CARD',
    "lastSeenAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Swap" (
    "id" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'REQUESTED',
    "message" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseReason" "PauseReason",
    "pausedByProductId" TEXT,
    "endedAt" TIMESTAMP(3),
    "renewalAAgreed" BOOLEAN NOT NULL DEFAULT false,
    "renewalBAgreed" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Swap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "type" "EventType" NOT NULL,
    "swapId" TEXT NOT NULL,
    "slotId" TEXT,
    "sourceProductId" TEXT NOT NULL,
    "destinationProductId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "clickId" TEXT,
    "convertedClickId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalt" (
    "day" DATE NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySalt_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "MetricSource" NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "config" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" "MetricSource" NOT NULL,
    "revenueBand" TEXT,
    "mrrCents" INTEGER,
    "activeSubscriptions" INTEGER,
    "customerCount" INTEGER,
    "monthlyVisitors" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Product_domain_key" ON "Product"("domain");

-- CreateIndex
CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");

-- CreateIndex
CREATE INDEX "Product_status_listedAt_idx" ON "Product"("status", "listedAt");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DomainVerification_productId_key" ON "DomainVerification"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainVerification_token_key" ON "DomainVerification"("token");

-- CreateIndex
CREATE INDEX "Slot_productId_idx" ON "Slot"("productId");

-- CreateIndex
CREATE INDEX "Slot_lastSeenAt_idx" ON "Slot"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Swap_pairKey_status_idx" ON "Swap"("pairKey", "status");

-- CreateIndex
CREATE INDEX "Swap_productAId_status_idx" ON "Swap"("productAId", "status");

-- CreateIndex
CREATE INDEX "Swap_productBId_status_idx" ON "Swap"("productBId", "status");

-- CreateIndex
CREATE INDEX "Swap_status_endsAt_idx" ON "Swap"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_clickId_key" ON "Event"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_dedupeKey_key" ON "Event"("dedupeKey");

-- CreateIndex
CREATE INDEX "Event_swapId_type_createdAt_idx" ON "Event"("swapId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_destinationProductId_type_createdAt_idx" ON "Event"("destinationProductId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_slotId_type_createdAt_idx" ON "Event"("slotId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_productId_provider_key" ON "Integration"("productId", "provider");

-- CreateIndex
CREATE INDEX "MetricSnapshot_productId_source_fetchedAt_idx" ON "MetricSnapshot"("productId", "source", "fetchedAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainVerification" ADD CONSTRAINT "DomainVerification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_productAId_fkey" FOREIGN KEY ("productAId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_productBId_fkey" FOREIGN KEY ("productBId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "Swap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_destinationProductId_fkey" FOREIGN KEY ("destinationProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
