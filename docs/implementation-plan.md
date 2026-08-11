# Filmprint — Phase 1 Implementation & Calibration Plan

## 1. Scope
Phase 1 implements the core movie taste calibration engine:
- Server-side candidate queue endpoint (`GET /api/movies/queue`).
- Server-side interaction persistence endpoint (`POST /api/interactions`).
- Two-step interactive single-movie card (`MovieCard.tsx`).
- Optimistic queue state management and poster preloading (`CalibrationEngine.tsx`).
- 30-film calibration progress tracking and completion state.
- Keyboard shortcuts (`1`, `2`, `3`, `4`) and mobile-friendly touch targets.
- Clean production UI (removed all Phase 0 development/debug panels).

---

## 2. Component & API Inventory

### API Endpoints
- `app/api/movies/queue/route.ts` [NEW] — Returns un-answered movie queue & user progress count.
- `app/api/interactions/route.ts` [NEW] — Validates & records `WATCHED`, `NOT_WATCHED`, `UNSURE` interactions.

### UI Components
- `components/movie/MovieCard.tsx` [NEW] — 2-step single movie card with poster frame and rating step.
- `components/movie/CalibrationEngine.tsx` [NEW] — Stateful optimistic queue & completion screen.
- `components/ui/Header.tsx` [UPDATED] — Clean logo and `X / 30` progress pill.
- `app/page.tsx` [UPDATED] — Server-side initial data fetch & clean root render.
- `lib/tmdb/client.ts` [UPDATED] — Expanded 40-movie fallback dataset and genre mapping.

---

## 3. Verification Steps

1. TypeScript check: `npx tsc --noEmit` -> PASS
2. Next.js production build: `npm run build` -> PASS
3. Prisma schema validation: `npx prisma validate` -> PASS
4. Prisma client generation: `npx prisma generate` -> PASS
5. Docker Compose build: `docker compose build web` -> PASS
6. Docker Compose up: `docker compose up -d` -> PASS
7. Database migration: `prisma migrate deploy` -> PASS
8. `/api/health`: HTTP 200 `{ status: "ok", database: { status: "connected" } }` -> PASS
9. `/api/movies/queue?limit=5`: HTTP 200 returning candidate movies and `answeredCount` -> PASS
10. `POST /api/interactions` (WATCHED + LOVE): HTTP 200 -> PASS
11. `POST /api/interactions` (NOT_WATCHED): HTTP 200 -> PASS
12. `POST /api/interactions` (UNSURE): HTTP 200 -> PASS
13. Duplicate elimination: Answered movies are not returned in queue -> PASS
14. Session progress persistence across browser refreshes -> PASS
15. 30-film completion view -> PASS
16. Mobile layout responsiveness -> PASS
