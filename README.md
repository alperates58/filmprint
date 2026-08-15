# SineAI

Zevkini öğrenen yapay zekâ destekli film ve dizi rehberi.

## Product Idea
The user is shown one movie at a time and answers whether they have watched it. If watched, they rate it quickly. Over time, the system builds a personal **Film DNA** profile.

## MVP Goal
A user should be able to classify 30–50 movies in a few minutes and immediately get a meaningful taste profile.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Standalone Output)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS Tokens
- **Database**: PostgreSQL 16
- **ORM**: Prisma ORM (with automated migrations)
- **Deployment**: Docker & Docker Compose (Coolify ready)
- **API**: TMDB API (Server-side ONLY)

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 1. Fast Dev Mode (Local Node + Docker Postgres)
```bash
# Start local PostgreSQL container
docker compose up -d postgres

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Full Containerized Stack Mode
```bash
# Build and launch both web & postgres containers
docker compose up --build -d
```
### 3. Testing & Production Safety
```bash
# Run unit & regression test suite (17 test suites)
npm test

# Run Playwright E2E tests
npm run test:e2e

# Run schema drift & migration integrity detector
npm run db:verify

# Pre-deploy verification gate (validate + type-check + unit tests + db verify + build)
npm run verify
```

---


## Coolify Deployment

Filmprint is engineered for zero-downtime deployment via **Coolify** using the **Docker Compose** buildpack.

### Deployment Steps in Coolify

1. **Create New Project / Application**
   - Select **Public/Private Repository** from GitHub (`https://github.com/alperates58/filmprint`).
   - Branch: `main`.

2. **Select Build Pack**
   - Choose **Docker Compose**.
   - Coolify will automatically detect `docker-compose.yml` and `Dockerfile`.

3. **Configure Environment Variables**
   Set the following variables in Coolify's Environment settings:

   ```env
   NODE_ENV=production
   POSTGRES_DB=filmprint
   POSTGRES_USER=filmprint_user
   POSTGRES_PASSWORD=your_secure_postgres_password
   DATABASE_URL=postgresql://filmprint_user:your_secure_postgres_password@postgres:5432/filmprint?schema=public
   TMDB_API_KEY=your_tmdb_v3_api_key
   SESSION_SECRET=a_random_32_character_session_secret_key
   AUTH_SECRET=a_random_32_character_auth_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_APP_URL=https://sineai.com.tr
   ```

### Google Cloud OAuth 2.0 Configuration

To enable Google Sign-In in production:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create or select an **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized JavaScript origins**:
   - `https://sineai.com.tr`
4. Set **Authorized redirect URIs**:
   - `https://sineai.com.tr/api/auth/google/callback`
5. Save and copy `Client ID` and `Client Secret` into Coolify environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

4. **Port & Domain Mapping**
   - Expose Service Port: `3000`
   - Map your custom domain or Coolify auto-generated URL to the `web` service.

5. **Deploy & Redeploy Lifecycle**
   - Click **Deploy**.
   - Coolify pulls the latest code from GitHub `main`.
   - The multi-stage `Dockerfile` compiles Next.js in standalone mode.
   - Container startup runs `npx prisma migrate deploy` automatically before starting server `node server.js`.
   - The named volume `postgres_data` persists PostgreSQL records across container rebuilds and redeployments.

---

## Architecture & Design Docs
- [`docs/architecture.md`](file:///c:/Users/alper/Desktop/filmprint/docs/architecture.md)
- [`docs/design-system.md`](file:///c:/Users/alper/Desktop/filmprint/docs/design-system.md)
- [`docs/implementation-plan.md`](file:///c:/Users/alper/Desktop/filmprint/docs/implementation-plan.md)
