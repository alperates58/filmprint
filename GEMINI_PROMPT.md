You are the lead product engineer and UI/UX engineer for a new project called Filmprint.

PROJECT GOAL
Build a premium cinematic web application that learns a user's movie taste by showing one movie at a time and asking whether they have watched it.

The first release must remain extremely focused.

CORE USER FLOW
1. User opens the site.
2. Immediately show one movie from TMDB.
3. Ask: "Bunu izledin mi?"
4. Options:
   - İzledim
   - İzlemedim
   - Emin değilim
5. If the user selects "İzledim", ask:
   - Çok sevdim
   - Beğendim
   - Ortalama
   - Sevmedim
6. Save the interaction.
7. Immediately show the next movie.
8. After enough answers, build a Film DNA profile.

PRODUCT PRINCIPLE
This is not a normal movie database and not a generic recommendation site.
The initial product is a fast movie taste calibration experience.

The user should be able to answer 30-50 movies in a few minutes.

TECH STACK
- Next.js with App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Docker / Docker Compose
- TMDB API

Do not introduce extra frameworks unless genuinely necessary.

TMDB
- TMDB API access must be server-side only.
- API secrets must never be exposed to the browser.
- Cache movie metadata in PostgreSQL.

DATA MODEL
Create at least:

User
Movie
MovieInteraction
UserTasteProfile

MovieInteraction must support:
- WATCHED
- NOT_WATCHED
- UNSURE

Rating when watched:
- LOVE
- LIKE
- NEUTRAL
- DISLIKE

Use a unique constraint so the same user cannot answer the same movie twice.

AUTH / ONBOARDING
Do NOT force signup before using the app.
Create an anonymous persistent user/session using a secure cookie.
Account creation can come later.

DESIGN DIRECTION
Premium cinematic SaaS.
References in spirit only:
- Linear precision
- Apple TV polish
- Letterboxd restraint
- modern streaming interfaces

Do not copy any existing product.

Design requirements:
- dark-first
- elegant near-black surfaces
- large cinematic poster
- excellent typography
- generous spacing
- minimal UI chrome
- smooth 150-250 ms feeling transitions
- strong mobile support
- desktop and mobile must both feel intentional

Avoid:
- generic admin dashboard look
- SaaS sidebar in the MVP
- excessive glassmorphism
- excessive gradients
- crowded KPI cards
- flashy animations

PHASE 0 TASK
First inspect the project directory.
If the project does not exist yet, initialize it safely.

Then implement ONLY Phase 0 and the minimum shell required to begin Phase 1:

1. Next.js + TypeScript + Tailwind setup
2. PostgreSQL + Prisma
3. Docker Compose
4. .env.example
5. Prisma schema
6. TMDB server-side client
7. anonymous user/session infrastructure
8. health endpoint
9. base design tokens/global styles
10. minimal landing/discover shell ready for movie cards

Do not build Movie Night yet.
Do not add AI runtime integration yet.
Do not build social features.
Do not overengineer recommendation algorithms yet.

DOCUMENTATION
Before implementation, create or update:
- docs/architecture.md
- docs/design-system.md
- docs/implementation-plan.md

implementation-plan.md must clearly list:
- files that will be created or changed
- database schema
- environment variables
- Phase 0 validation steps

Then implement Phase 0.

VALIDATION
Before reporting completion, verify:
- project builds
- TypeScript passes
- Prisma schema validates
- Docker Compose config validates
- TMDB secret is server-side only
- no hardcoded secrets
- app starts successfully

Do not claim something works unless you actually verified it.

GIT SAFETY
- Do not delete existing work.
- Do not force reset.
- Do not push or deploy unless explicitly instructed.
- If a Git repository exists, inspect its state first.

At the end, report:
1. What was created
2. What was changed
3. Validation results
4. Any blockers
5. Exact recommended next step for Phase 1

Start now.
