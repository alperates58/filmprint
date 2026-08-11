# Filmprint Architecture

## Application
Next.js app using App Router.

## Suggested structure

app/
  page.tsx
  discover/page.tsx
  profile/page.tsx
  api/
    movies/next/route.ts
    interactions/route.ts
    profile/route.ts

components/
  movie/
  profile/
  ui/

lib/
  tmdb/
  db/
  scoring/
  profile/

prisma/
  schema.prisma

## TMDB integration
Server-side only.

Needed TMDB data:
- id
- title
- original_title
- poster_path
- backdrop_path
- release_date
- genre_ids / genres
- popularity
- vote_average
- runtime
- credits where needed later

Cache local Movie records to reduce API calls.

## Authentication
For fastest MVP, allow anonymous local session first.
Create a persistent anonymous user ID using secure cookie.
Account creation can be added after the user has answered enough films.

Do not block first interaction with signup.

## Data model direction
User
- id
- createdAt
- updatedAt

Movie
- id
- tmdbId unique
- title
- originalTitle
- posterPath
- backdropPath
- releaseYear
- popularity
- voteAverage
- metadata json
- createdAt
- updatedAt

MovieInteraction
- id
- userId
- movieId
- status
- rating nullable
- answeredAt
- unique(userId, movieId)

UserTasteProfile
- id
- userId unique
- version
- profileJson
- confidence
- updatedAt

## Performance
- prefetch the next 2-3 movies
- optimistic save interaction
- cache TMDB data
- avoid blocking UI on profile recalculation

## Security
- TMDB secret never in client bundle
- validate all interaction payloads
- rate-limit public endpoints when deployed
- keep cookies HttpOnly where appropriate
