-- ============================================================================
-- SINEAI — PHASE H DEDICATED CONCURRENT INDEX EXECUTION SCRIPT
-- Run this script with psql directly (outside of any transaction block):
-- psql -h <HOST> -U <USER> -d <DB> -f scripts/apply-phase-h-indexes.sql
-- ============================================================================

-- 1. Extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Movie Large-Table Performance B-Tree Indexes (Concurrent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movie_calibrationPriorityScore_idx" 
    ON "Movie"("calibrationPriorityScore" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movie_safetyLevel_calibrationPriorityScore_idx" 
    ON "Movie"("safetyLevel", "calibrationPriorityScore" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movie_releaseYear_calibrationPriorityScore_idx" 
    ON "Movie"("releaseYear", "calibrationPriorityScore" DESC);

-- 3. TvShow Large-Table Performance B-Tree Indexes (Concurrent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TvShow_calibrationPriorityScore_idx" 
    ON "TvShow"("calibrationPriorityScore" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TvShow_safetyLevel_calibrationPriorityScore_idx" 
    ON "TvShow"("safetyLevel", "calibrationPriorityScore" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TvShow_firstAirYear_calibrationPriorityScore_idx" 
    ON "TvShow"("firstAirYear", "calibrationPriorityScore" DESC);

-- 4. GIN Array Indexes for canonical integer genre IDs (Concurrent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movie_genreIds_gin_idx" 
    ON "Movie" USING GIN ("genreIds");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TvShow_genreIds_gin_idx" 
    ON "TvShow" USING GIN ("genreIds");

-- 5. GIN Trigram Indexes for search normalized titles (Concurrent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Movie_searchNormalizedTitle_trgm_idx" 
    ON "Movie" USING GIN ("searchNormalizedTitle" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TvShow_searchNormalizedTitle_trgm_idx" 
    ON "TvShow" USING GIN ("searchNormalizedTitle" gin_trgm_ops);
