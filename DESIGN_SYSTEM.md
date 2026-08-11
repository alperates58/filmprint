# Filmprint Design System

## Direction
Premium cinematic SaaS.
Think: Letterboxd restraint + Linear precision + Apple TV polish + modern streaming UI.
Do NOT make it look like a generic dashboard or admin panel.

## Visual principles
- Dark-first interface
- Near-black backgrounds, not pure black everywhere
- Large film imagery
- Strong typography
- Minimal chrome
- Spacious layouts
- Sharp hierarchy
- Motion should feel fast, not flashy
- Avoid excessive glassmorphism
- Avoid oversized gradients
- Avoid random neon colors

## Core palette guidance
Use semantic tokens rather than hardcoded colors.
Suggested roles:
- background
- surface
- elevated
- border
- text-primary
- text-secondary
- text-muted
- accent
- success
- warning
- destructive

## Typography
- Strong display font for movie titles
- Neutral sans-serif for UI
- Clear numeric hierarchy
- Avoid tiny low-contrast text

## Core components
- MovieCard
- PosterFrame
- ResponseButtons
- RatingButtons
- ProgressPill
- TasteMetric
- DNASection
- EmptyState
- SkeletonMovieCard

## Interaction design
The next movie should feel instant.
Target transition: 150-250 ms perceived latency.
Use optimistic UI where possible.

## Desktop
Movie card centered with cinematic whitespace.
Poster on left or centered depending on viewport.
Actions always reachable without scrolling.

## Mobile
Poster dominant but not so tall that actions fall below fold.
Large thumb-friendly buttons.

## Profile page
Should feel editorial, not dashboard-heavy.
Use visual sections rather than many tiny cards.

## Avoid
- generic SaaS sidebar in MVP
- 12-card KPI grids
- cluttered filters
- carousels everywhere
- feature bloat
