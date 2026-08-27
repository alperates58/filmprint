-- CreateTable
CREATE TABLE "MovieNightVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieNightVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieNightVote_sessionId_userId_key" ON "MovieNightVote"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "MovieNightVote_sessionId_idx" ON "MovieNightVote"("sessionId");

-- CreateIndex
CREATE INDEX "MovieNightVote_movieId_idx" ON "MovieNightVote"("movieId");

-- CreateIndex
CREATE INDEX "MovieNightVote_userId_idx" ON "MovieNightVote"("userId");

-- AddForeignKey
ALTER TABLE "MovieNightVote" ADD CONSTRAINT "MovieNightVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MovieNightSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieNightVote" ADD CONSTRAINT "MovieNightVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieNightVote" ADD CONSTRAINT "MovieNightVote_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
