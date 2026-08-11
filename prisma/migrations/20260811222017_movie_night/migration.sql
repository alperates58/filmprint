-- CreateEnum
CREATE TYPE "MovieNightStatus" AS ENUM ('LOBBY', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "MovieNightSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "status" "MovieNightStatus" NOT NULL DEFAULT 'LOBBY',
    "excludeWatched" BOOLEAN NOT NULL DEFAULT true,
    "selectedMovieId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieNightSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightMember" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieNightMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieNightSession_code_key" ON "MovieNightSession"("code");

-- CreateIndex
CREATE INDEX "MovieNightSession_code_idx" ON "MovieNightSession"("code");

-- CreateIndex
CREATE INDEX "MovieNightSession_hostUserId_idx" ON "MovieNightSession"("hostUserId");

-- CreateIndex
CREATE INDEX "MovieNightMember_sessionId_idx" ON "MovieNightMember"("sessionId");

-- CreateIndex
CREATE INDEX "MovieNightMember_userId_idx" ON "MovieNightMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieNightMember_sessionId_userId_key" ON "MovieNightMember"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "MovieNightSession" ADD CONSTRAINT "MovieNightSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieNightSession" ADD CONSTRAINT "MovieNightSession_selectedMovieId_fkey" FOREIGN KEY ("selectedMovieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieNightMember" ADD CONSTRAINT "MovieNightMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MovieNightSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieNightMember" ADD CONSTRAINT "MovieNightMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
