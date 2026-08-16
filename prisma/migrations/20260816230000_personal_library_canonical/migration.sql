-- CreateEnum: LibraryState if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LibraryState') THEN
        CREATE TYPE "LibraryState" AS ENUM ('WATCHLIST', 'WATCHED', 'DROPPED');
    END IF;
END $$;

-- CreateTable: UserContentLibrary if not exists
CREATE TABLE IF NOT EXISTS "UserContentLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'FILM',
    "movieId" TEXT,
    "tvShowId" TEXT,
    "state" "LibraryState" NOT NULL DEFAULT 'WATCHLIST',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "watchedAt" TIMESTAMP(3),
    "droppedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "UserContentLibrary_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserContentLibrary_userId_fkey'
    ) THEN
        ALTER TABLE "UserContentLibrary" ADD CONSTRAINT "UserContentLibrary_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserContentLibrary_movieId_fkey'
    ) THEN
        ALTER TABLE "UserContentLibrary" ADD CONSTRAINT "UserContentLibrary_movieId_fkey"
            FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserContentLibrary_tvShowId_fkey'
    ) THEN
        ALTER TABLE "UserContentLibrary" ADD CONSTRAINT "UserContentLibrary_tvShowId_fkey"
            FOREIGN KEY ("tvShowId") REFERENCES "TvShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Unique and Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "UserContentLibrary_userId_movieId_key" ON "UserContentLibrary"("userId", "movieId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserContentLibrary_userId_tvShowId_key" ON "UserContentLibrary"("userId", "tvShowId");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_userId_idx" ON "UserContentLibrary"("userId");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_mediaType_idx" ON "UserContentLibrary"("mediaType");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_state_idx" ON "UserContentLibrary"("state");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_isFavorite_idx" ON "UserContentLibrary"("isFavorite");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_userId_mediaType_state_idx" ON "UserContentLibrary"("userId", "mediaType", "state");
CREATE INDEX IF NOT EXISTS "UserContentLibrary_userId_isFavorite_idx" ON "UserContentLibrary"("userId", "isFavorite");
