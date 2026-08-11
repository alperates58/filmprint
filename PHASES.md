# Filmprint Development Phases

## Phase 0 — Foundation
Goal: create a clean, production-ready foundation without overengineering.

Deliverables:
- Next.js + TypeScript
- Tailwind
- PostgreSQL
- Prisma
- Docker Compose
- `.env.example`
- health endpoint
- TMDB server-side client
- basic database migrations

Initial entities:
- User
- Movie
- MovieInteraction
- UserTasteProfile

MovieInteraction fields:
- id
- userId
- tmdbMovieId
- status: WATCHED | NOT_WATCHED | UNSURE
- rating: LOVE | LIKE | NEUTRAL | DISLIKE | null
- answeredAt

Constraints:
- Never expose TMDB API key client-side
- Cache TMDB movie metadata locally
- Keep architecture simple

## Phase 1 — Core Movie Flow
Goal: make the core interaction addictive and fast.

Deliverables:
- full-screen movie card
- poster
- title
- year
- genres
- runtime when available
- buttons: Watched / Not watched / Unsure
- rating step after Watched
- optimistic transition to next movie
- keyboard shortcuts
- mobile gestures optional
- session progress counter

Movie selection strategy v1:
- start from highly recognizable movies
- mix genres and decades
- avoid asking the same movie twice
- avoid long streaks from one genre

Target metric:
- 30 interactions in under 3 minutes

## Phase 2 — Film DNA Profile
Goal: reward the user immediately for answering.

Deliverables:
- number of movies rated
- favorite genres
- disliked genres
- decade preference
- favorite directors where enough data exists
- confidence indicator
- taste archetype

Example archetypes:
- Mind-Bender
- Adrenaline Seeker
- Prestige Drama Fan
- Comfort Watcher
- Horror Explorer
- Mainstream Cinephile

Important:
- calculate profile deterministically first
- AI-generated prose is optional later

## Phase 3 — Smarter Question Engine
Goal: ask fewer but more informative questions.

Deliverables:
- weighted movie selection
- explore vs exploit balance
- genre diversification
- director/cast affinity signals
- popularity weighting
- confidence-based next question selection
- recommendation readiness score

Basic scoring idea:
NextMovieScore = familiarity_probability + information_gain + diversity_bonus - repetition_penalty

No LLM required.

## Phase 4 — Recommendation Layer
Goal: convert profile into useful movie discovery.

Deliverables:
- “You should watch this” feed
- compatibility score
- explanation based on watched films
- exclude watched titles
- allow dismiss/save

Example:
Prisoners — 94% match
Because you loved Se7en, Gone Girl and Zodiac.

## Phase 5 — Movie Night
Goal: merge multiple Film DNA profiles.

Deliverables:
- create room
- QR/code join
- multiple users
- filters: duration, genre, release year
- only show films nobody has watched
- group compatibility score
- ranked final shortlist

Movie Night should reuse the same interaction/profile engine built earlier.
