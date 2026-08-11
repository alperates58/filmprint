-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('WATCHED', 'NOT_WATCHED', 'UNSURE');

-- CreateEnum
CREATE TYPE "RatingStatus" AS ENUM ('LOVE', 'LIKE', 'NEUTRAL', 'DISLIKE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseYear" INTEGER,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "voteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "status" "InteractionStatus" NOT NULL,
    "rating" "RatingStatus",
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "profileJson" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_tmdbId_idx" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_popularity_idx" ON "Movie"("popularity");

-- CreateIndex
CREATE INDEX "MovieInteraction_userId_idx" ON "MovieInteraction"("userId");

-- CreateIndex
CREATE INDEX "MovieInteraction_movieId_idx" ON "MovieInteraction"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieInteraction_userId_movieId_key" ON "MovieInteraction"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTasteProfile_userId_key" ON "UserTasteProfile"("userId");

-- AddForeignKey
ALTER TABLE "MovieInteraction" ADD CONSTRAINT "MovieInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieInteraction" ADD CONSTRAINT "MovieInteraction_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTasteProfile" ADD CONSTRAINT "UserTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
