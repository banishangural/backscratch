#!/usr/bin/env bash
# Vercel build: apply pending Prisma migrations, then build the app.
# Vercel runs `npm run vercel-build` instead of `npm run build` when that script exists.
# Migrations run only for production deploys, so a preview of an unmerged branch
# can never change the production database schema.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy
else
  echo "Skipping migrations (VERCEL_ENV=${VERCEL_ENV:-unset})."
fi

npx prisma generate
npx next build
