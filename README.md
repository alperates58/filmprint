# Filmprint

Premium movie taste profiling web app powered by TMDB.

## Product idea
The user is shown one movie at a time and answers whether they have watched it. If watched, they rate it quickly. Over time, the system builds a personal Film DNA profile.

## MVP goal
A user should be able to classify 30-50 movies in a few minutes and immediately get a meaningful taste profile.

## Core principles
- Extremely fast interaction
- One movie at a time
- No clutter
- Premium cinematic SaaS design
- TMDB API server-side only
- No AI runtime dependency in V1
- Data model ready for future Movie Night matching

## Suggested stack
- Next.js 15+
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Docker / Docker Compose
- TMDB API

## Core flow
1. User opens app
2. App shows a movie
3. User answers: Watched / Not watched / Unsure
4. If watched: Love / Like / Neutral / Dislike
5. Next movie appears instantly
6. After enough answers, Film DNA profile appears

## Future product layers
- Personalized recommendations
- Movie Night rooms
- Friend taste matching
- Social comparison
- AI-generated profile summaries
