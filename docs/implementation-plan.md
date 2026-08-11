# Filmprint — Phase 0 Implementation Plan

## 1. Scope
Phase 0 focuses on establishing a clean, secure, production-ready foundation:
- Application initialization with Next.js App Router, TypeScript, and Tailwind CSS.
- PostgreSQL database setup with Prisma ORM.
- Docker Compose configuration for local development.
- Server-side TMDB API integration with local metadata caching design.
- Anonymous user session management via HttpOnly secure cookies.
- System health monitoring endpoint (`/api/health`).
- Semantic design token foundation and minimal landing/discover product shell.

---

## 2. Files to be Created or Modified

### Config & Infrastructure
- `package.json` [NEW]
- `tsconfig.json` [NEW]
- `tailwind.config.ts` [NEW]
- `postcss.config.js` [NEW]
- `next.config.ts` [NEW]
- `.env.example` [NEW]
- `.gitignore` [NEW]
- `docker-compose.yml` [NEW]

### Database (Prisma)
- `prisma/schema.prisma` [NEW]
- `prisma/migrations/` [NEW]

### Application Logic (`lib/`)
- `lib/db/client.ts` — Prisma client singleton [NEW]
- `lib/tmdb/client.ts` — Server-side TMDB client [NEW]
- `lib/session/index.ts` — Cookie-based anonymous session manager [NEW]

### App Router & API (`app/`)
- `app/globals.css` — Semantic design tokens & styling [NEW]
- `app/layout.tsx` — Root layout [NEW]
- `app/page.tsx` — Minimal product shell / discover preview [NEW]
- `app/api/health/route.ts` — System health endpoint [NEW]

### UI Components (`components/`)
- `components/movie/MovieCardSkeleton.tsx` — Skeleton loader preview [NEW]
- `components/ui/Header.tsx` — Cinematic header [NEW]

---

## 3. Database Schema (Prisma Models)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum InteractionStatus {
  WATCHED
  NOT_WATCHED
  UNSURE
}

enum RatingStatus {
  LOVE
  LIKE
  NEUTRAL
  DISLIKE
}

model User {
  id           String             @id @default(uuid())
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  interactions MovieInteraction[]
  tasteProfile UserTasteProfile?
}

model Movie {
  id            String             @id @default(uuid())
  tmdbId        Int                @unique
  title         String
  originalTitle String
  posterPath    String?
  backdropPath  String?
  releaseYear   Int?
  popularity    Float              @default(0.0)
  voteAverage   Float              @default(0.0)
  metadata      Json               @default("{}")
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  interactions  MovieInteraction[]

  @@index([tmdbId])
  @@index([popularity])
}

model MovieInteraction {
  id         String            @id @default(uuid())
  userId     String
  movieId    String
  status     InteractionStatus
  rating     RatingStatus?
  answeredAt DateTime          @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie Movie @relation(fields: [movieId], references: [id], onDelete: Cascade)

  @@unique([userId, movieId])
  @@index([userId])
  @@index([movieId])
}

model UserTasteProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  version     Int      @default(1)
  profileJson Json     @default("{}")
  confidence  Float    @default(0.0)
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 4. Environment Variables (`.env.example`)
```env
# Database
DATABASE_URL="postgresql://filmprint:filmprint_dev_secret@localhost:5432/filmprint?schema=public"

# TMDB API (Server-side ONLY)
TMDB_API_KEY="your_tmdb_api_key_here"

# Session Security
SESSION_SECRET="filmprint_anonymous_session_secret_32chars"

# App environment
NODE_ENV="development"
```

---

## 5. API Endpoints (Phase 0)
- `GET /api/health`: Validates server uptime, database connectivity, and configuration status.

---

## 6. Anonymous Session Strategy
- Implemented in `lib/session/index.ts`.
- Uses `cookies()` from `next/headers`.
- Cookie name: `filmprint_session`
- Attributes: `HttpOnly=true`, `SameSite=Lax`, `Secure` (when `NODE_ENV=production`), `MaxAge=31536000` (1 year).
- If cookie does not exist on incoming request, auto-generates a UUID and inserts a new `User` record in PostgreSQL.

---

## 7. TMDB Strategy
- Server-side client module: `lib/tmdb/client.ts`.
- Environment variable `TMDB_API_KEY` is kept server-side.
- Provides functions:
  - `fetchTrendingMovies(page)`
  - `fetchMovieDetails(tmdbId)`
- Includes graceful fallback data if `TMDB_API_KEY` is not set during local offline development.
- Automatically caches retrieved TMDB metadata into PostgreSQL `Movie` table.

---

## 8. Design System Implementation
- CSS variables defined in `app/globals.css`.
- Tailwind CSS configured to map `--background`, `--surface`, `--border`, `--text-primary`, `--accent` tokens.
- Modern dark-first layout with high contrast typography and cinematic poster focus.

---

## 9. Validation Steps
1. Package dependencies install cleanly via npm.
2. Next.js production build succeeds (`npm run build`).
3. TypeScript compiler check succeeds (`npx tsc --noEmit`).
4. Prisma schema validates (`npx prisma validate`).
5. Prisma client generates (`npx prisma generate`).
6. Docker Compose config validates (`docker compose config`).
7. PostgreSQL container starts and runs healthy (`docker compose up -d`).
8. Prisma database migration applies (`npx prisma migrate dev`).
9. Application starts locally (`npm run dev`).
10. `/api/health` endpoint returns status 200 with `{ status: "ok", db: "connected" }`.
