-- CreateEnum
CREATE TYPE "AdSurface" AS ENUM ('MOVIE', 'TV', 'GENRE', 'EDITORIAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "AdDeviceTarget" AS ENUM ('ALL', 'MOBILE', 'DESKTOP');

-- CreateEnum
CREATE TYPE "AdAudienceTarget" AS ENUM ('ALL', 'ANONYMOUS_ONLY', 'AUTHENTICATED_ONLY');

-- CreateEnum
CREATE TYPE "AdSenseUnitState" AS ENUM ('ACTIVE', 'ARCHIVED', 'UNSPECIFIED');

-- CreateTable
CREATE TABLE "AdSenseInventoryUnit" (
    "id" TEXT NOT NULL,
    "providerResourceName" TEXT NOT NULL,
    "reportingDimensionId" TEXT,
    "displayName" TEXT NOT NULL,
    "state" "AdSenseUnitState" NOT NULL DEFAULT 'ACTIVE',
    "type" TEXT,
    "size" TEXT,
    "adClientId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSenseInventoryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "surface" "AdSurface" NOT NULL DEFAULT 'GLOBAL',
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "adUnitId" TEXT,
    "deviceTarget" "AdDeviceTarget" NOT NULL DEFAULT 'ALL',
    "audience" "AdAudienceTarget" NOT NULL DEFAULT 'ANONYMOUS_ONLY',
    "minViewportWidth" INTEGER,
    "maxViewportWidth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "adsMasterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publisherId" TEXT,
    "adClientId" TEXT,
    "adminPreviewMode" BOOLEAN NOT NULL DEFAULT false,
    "anonymousOnlyDefault" BOOLEAN NOT NULL DEFAULT true,
    "maxAdsPerPage" INTEGER NOT NULL DEFAULT 2,
    "cmpConfigured" BOOLEAN NOT NULL DEFAULT false,
    "cmpProvider" TEXT NOT NULL DEFAULT 'google',
    "adsTxtCustom" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonetizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSenseInventoryUnit_providerResourceName_key" ON "AdSenseInventoryUnit"("providerResourceName");

-- CreateIndex
CREATE INDEX "AdSenseInventoryUnit_state_idx" ON "AdSenseInventoryUnit"("state");

-- CreateIndex
CREATE INDEX "AdSenseInventoryUnit_reportingDimensionId_idx" ON "AdSenseInventoryUnit"("reportingDimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlacement_key_key" ON "AdPlacement"("key");

-- CreateIndex
CREATE INDEX "AdPlacement_surface_enabled_idx" ON "AdPlacement"("surface", "enabled");

-- CreateIndex
CREATE INDEX "AdPlacement_key_idx" ON "AdPlacement"("key");

-- AddForeignKey
ALTER TABLE "AdPlacement" ADD CONSTRAINT "AdPlacement_adUnitId_fkey" FOREIGN KEY ("adUnitId") REFERENCES "AdSenseInventoryUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
