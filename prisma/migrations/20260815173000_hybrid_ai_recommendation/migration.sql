-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('FILM', 'TV');

-- CreateTable
CREATE TABLE "UserAiTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'FILM',
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "aiTasteVersion" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT NOT NULL,
    "tasteJson" JSONB NOT NULL DEFAULT '{}',
    "sourceEvidenceCount" INTEGER NOT NULL DEFAULT 0,
    "inputFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiTasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'FILM',
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "matchVersion" INTEGER NOT NULL DEFAULT 32,
    "aiTasteVersion" INTEGER NOT NULL DEFAULT 1,
    "candidateFingerprint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AiRecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAiTasteProfile_userId_idx" ON "UserAiTasteProfile"("userId");

-- CreateIndex
CREATE INDEX "UserAiTasteProfile_mediaType_idx" ON "UserAiTasteProfile"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "UserAiTasteProfile_userId_mediaType_key" ON "UserAiTasteProfile"("userId", "mediaType");

-- CreateIndex
CREATE INDEX "AiRecommendationSnapshot_userId_mediaType_candidateFingerpr_idx" ON "AiRecommendationSnapshot"("userId", "mediaType", "candidateFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AiRecommendationSnapshot_userId_mediaType_profileVersion_ma_key" ON "AiRecommendationSnapshot"("userId", "mediaType", "profileVersion", "matchVersion", "aiTasteVersion", "candidateFingerprint");

-- AddForeignKey
ALTER TABLE "UserAiTasteProfile" ADD CONSTRAINT "UserAiTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendationSnapshot" ADD CONSTRAINT "AiRecommendationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
