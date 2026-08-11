# Filmprint — System Architecture (Phase 0)

## Overview
Filmprint is a high-performance, single-movie taste calibration engine designed to build a user's **Film DNA** profile through rapid single-item interactions.

This document defines the architectural principles, component structure, data models, session management, and server-side TMDB integration boundaries for Phase 0 and beyond.

---

## Technical Stack
- **Framework**: Next.js 15 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript (Strict mode enabled)
- **Styling**: Tailwind CSS + Custom CSS Design Tokens
- **Database**: PostgreSQL 16
- **ORM**: Prisma ORM
- **Containerization**: Docker & Docker Compose (Local development environment)
- **External API**: TMDB API v3 (Strictly server-side access)

---

## System Boundaries & Directory Structure

```text
filmprint/
├── app/                        # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── health/             # Health check endpoint (/api/health)
│   │   ├── movies/
│   │   │   └── next/           # GET next movie for user
│   │   └── interactions/       # POST movie watched/rating interaction
│   ├── layout.tsx              # Root layout with dark theme & design tokens
│   ├── page.tsx                # Minimal product shell / landing discover experience
│   └── globals.css             # Semantic CSS variables and design tokens
├── components/                 # UI components
│   ├── movie/                  # Movie display & action components (MovieCard, Skeleton)
│   ├── profile/                # Taste profile components (future Phase 2)
│   └── ui/                     # Reusable design primitives (Buttons, Pills, Cards)
├── lib/                        # Core server and domain logic
│   ├── db/                     # Prisma client singleton
│   ├── tmdb/                   # Server-side TMDB API client & mapping
│   ├── session/                # Anonymous user session management (Cookie-based)
│   ├── scoring/                # Scoring & candidate selection algorithms
│   └── profile/                # Profile aggregation engine
├── prisma/
│   ├── schema.prisma           # Prisma schema definition
│   └── migrations/             # Database migration history
├── docs/                       # Project documentation
│   ├── architecture.md
│   ├── design-system.md
│   └── implementation-plan.md
├── docker-compose.yml          # PostgreSQL service container definition
├── .env.example                # Template for required environment variables
└── README.md
```

---

## Data Architecture & Database Models

The database schema is designed in `prisma/schema.prisma` with 4 core entities:

### 1. `User`
Represents an anonymous or authenticated user session.
- `id` (String / UUID, Primary Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### 2. `Movie`
Local cache of TMDB movie metadata to minimize external latency and rate limits.
- `id` (String / UUID, Primary Key)
- `tmdbId` (Int, Unique Index)
- `title` (String)
- `originalTitle` (String)
- `posterPath` (String, Nullable)
- `backdropPath` (String, Nullable)
- `releaseYear` (Int, Nullable)
- `popularity` (Float)
- `voteAverage` (Float)
- `metadata` (Json, extra fields: genres, runtime, overview)
- `createdAt` / `updatedAt` (DateTime)

### 3. `MovieInteraction`
User decisions recorded per movie.
- `id` (String / UUID, Primary Key)
- `userId` (String, Foreign Key -> User.id)
- `movieId` (String, Foreign Key -> Movie.id)
- `status` (Enum: `WATCHED`, `NOT_WATCHED`, `UNSURE`)
- `rating` (Enum: `LOVE`, `LIKE`, `NEUTRAL`, `DISLIKE`, Nullable)
- `answeredAt` (DateTime)
- **Constraint**: `@@unique([userId, movieId])` — Prevents duplicate answers per movie for the same user.

### 4. `UserTasteProfile`
Calculated Film DNA aggregate profile.
- `id` (String / UUID, Primary Key)
- `userId` (String, Unique Foreign Key -> User.id)
- `version` (Int)
- `profileJson` (Json, stores genres preference, decade distribution, archetype)
- `confidence` (Float)
- `updatedAt` (DateTime)

---

## Server-Side TMDB Integration & Local Metadata Caching

1. **Security Layer**: `TMDB_API_KEY` is loaded strictly on the server side in `lib/tmdb/client.ts`. It is never exposed via `NEXT_PUBLIC_*` environment variables.
2. **Metadata Sync**: When fetching candidates, the server fetches trending/popular movies from TMDB, normalizes the payload, and upserts them into the PostgreSQL `Movie` table.
3. **Optimistic Pre-fetching**: Future candidate selection queries pull directly from cached `Movie` records in PostgreSQL for ultra-low latency (<200ms).

---

## Anonymous Session Strategy

1. **Zero-Friction Access**: Users visit the site without mandatory registration.
2. **Cookie Provisioning**: A secure HTTP-Only cookie `filmprint_session` stores an opaque UUID string.
3. **Cookie Configuration**:
   - `HttpOnly`: True (Inaccessible via JavaScript DOM)
   - `SameSite`: Lax
   - `Secure`: True in production environments
   - `MaxAge`: 1 year (31,536,000 seconds)
4. **Migration Path**: The `User` model can easily link to an `auth` table in future phases without breaking user interaction history.

---

## Health Monitoring

The `/api/health` route handler evaluates:
1. Application status (`status: "ok"` or `"degraded"`)
2. Database connection status via Prisma query (`SELECT 1`)
3. Environment variables verification (without revealing secret values)
