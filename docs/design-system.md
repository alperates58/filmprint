# Filmprint — Design System (Phase 0)

## Direction & Aesthetic Identity
Filmprint adopts a **Premium Cinematic SaaS** visual direction:
- **Atmosphere**: Near-black surfaces, high contrast, cinematic poster art focus, subtle dark elevate borders.
- **Reference Spirit**: Letterboxd restraint + Linear precision + Apple TV polish.
- **Strict Avoidances**: Generic SaaS sidebars, admin KPI grids, oversized neon gradients, dev-tool blue accents, excessive glassmorphism, crowded filters.

---

## Semantic Color System (Tokens)

Design tokens are defined in `app/globals.css` using CSS custom properties:

```css
:root {
  /* Color Palette — Near Black Surfaces */
  --background: #09090b;       /* Deep obsidian canvas */
  --surface: #121216;          /* Movie card container background */
  --surface-elevated: #18181f; /* Hover states, dropdowns, floating elements */
  --border: #24242d;           /* Subtle structural dividers */
  --border-focused: #3b3b47;   /* Active border states */

  /* Typography Colors */
  --text-primary: #f4f4f5;     /* High contrast titles & core text */
  --text-secondary: #a1a1aa;   /* Subtitles, labels, metadata */
  --text-muted: #71717a;       /* Footer notes, timestamps, subtle hints */

  /* Accents & Statuses */
  --accent: #e50914;           /* Cinematic crimson key action highlight */
  --accent-hover: #f41f2a;     /* Accent hover state */
  --success: #10b981;          /* Positive rating (Love / Like) */
  --warning: #f59e0b;          /* Neutral rating / Unsure */
  --destructive: #ef4444;      /* Dislike action */

  /* Radius & Shadows */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --shadow-cinematic: 0 20px 50px rgba(0, 0, 0, 0.7);
}
```

---

## Typography Hierarchy
- **Primary UI & Headings**: Inter / System Sans-serif (`var(--font-sans)`)
- **Cinematic Display**: Sans-serif, tracking tight, high contrast font weight (`font-semibold` / `font-bold`)
- **Metadata**: Monospace / Crisp Sans (`font-mono`, `text-xs`, `tracking-wider`)

---

## Key Component Blueprint

### 1. `MovieCard`
- **Centerpiece**: Full focus on film artwork (2:3 aspect ratio poster frame).
- **Backdrop**: Subtle dark background vignette based on film backdrop art.
- **Information Layer**: Film title, release year, runtime, genres pill list.

### 2. `ResponseButtons`
- Primary triple actions:
  - `İzledim` (Watched) — Primary action state
  - `İzlemedim` (Not Watched) — Secondary action state
  - `Emin Değilim` (Unsure) — Tertiary muted action state

### 3. `RatingButtons`
- Secondary multi-option rating bar (revealed after "İzledim"):
  - `Çok Sevdim` (Loved)
  - `Beğendim` (Liked)
  - `Ortalama` (Neutral)
  - `Sevmedim` (Disliked)

### 4. `ProgressPill`
- Top floating progress tracking pill showing session interaction counter (e.g. `14 / 30 films classified`).

### 5. `SkeletonMovieCard`
- Premium animated pulse skeleton loader for transition states.

---

## Interaction & Micro-Animation Guidelines
- **Perceived Latency Target**: 150ms – 250ms for card transitions.
- **Optimistic Response**: UI responds immediately on user press before server confirmation completes.
- **Keyboard Shortcuts**: `[1]` Watched, `[2]` Not Watched, `[3]` Unsure.
