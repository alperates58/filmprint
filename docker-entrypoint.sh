#!/bin/sh
set -e

echo "[Filmprint Entrypoint] Running Prisma database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[Filmprint Entrypoint] Starting Next.js standalone server..."
exec node server.js
