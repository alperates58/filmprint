# Filmprint — System Architecture (Phase 1.5 Admin Console)

## Overview
Filmprint is a single-movie taste calibration engine designed to build a user's **Film DNA** profile through rapid single-item interactions.

Phase 1.5 introduces an isolated, secure **Admin Console** (`/admin`) for operational metrics, anonymous user management, AES-256-GCM encrypted external integrations (TMDB & DeepSeek AI), system settings, and audit logs.

---

## Technical Stack & Production Deployment Model

```text
GitHub (main) ──> Coolify ──> Docker Compose ──> [ web container (Next.js Standalone :3000) ]
                                                       │
                                                       └──> [ postgres container (:5432 internal) ]
                                                                 │
                                                                 └──> postgres_data (volume)
```

- **Framework**: Next.js 15 (App Router, Standalone Output mode)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS + Custom Dark Design Tokens
- **Database**: PostgreSQL 16
- **ORM**: Prisma ORM with versioned SQL migrations (`prisma/migrations/`)
- **Encryption**: AES-256-GCM (Master Key via `MASTER_ENCRYPTION_KEY` env var)
- **Password Hashing**: Node.js `scrypt` with random salt
- **Admin Session**: Separate HttpOnly cookie `filmprint_admin_session`

---

## Security Architecture & Secret Management

1. **AES-256-GCM Encrypted Storage**: External API keys (TMDB, DeepSeek) are encrypted in PostgreSQL using `IntegrationSecret`. Format: `${ivHex}:${authTagHex}:${ciphertextHex}`.
2. **Master Encryption Key**: Loaded strictly on server from `MASTER_ENCRYPTION_KEY` env variable. Never exposed to browser or saved in database.
3. **Secret Masking**: Admin APIs return masked strings (`••••••••••••91ab`) or `lastFour`. Raw secrets are NEVER sent to the client.
4. **Resolution Hierarchy**:
   - Encrypted DB `IntegrationSecret` (Highest priority)
   - Environment variable fallback (`TMDB_API_KEY`, `DEEPSEEK_API_KEY`)
   - Not configured
5. **Initial Bootstrap**: Automatic creation of initial `AdminUser` from `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` env vars if no admin exists.

---

## Admin Endpoints & Routes

- `/admin/login` — Isolated admin authentication screen.
- `/admin` — System & calibration overview metrics dashboard.
- `/admin/users` & `/admin/users/[id]` — Anonymous user list and interaction detail.
- `/admin/integrations` — TMDB and DeepSeek configuration & test connection buttons.
- `/admin/settings` — System settings (calibration threshold default 30, queue preloading count, AI toggle).
- `/admin/system` — Health, database status, runtime uptime, and migration information.
