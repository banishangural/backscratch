#!/usr/bin/env bash
# Vercel build: apply pending Prisma migrations, then build the app.
# Vercel runs `npm run vercel-build` instead of `npm run build` when that script exists.
#
# Production: migrates the production database.
# Preview: migrates the preview's own database. This relies on the Neon integration's
# "create a branch for Preview deployments" setting, which gives every preview its own
# Neon branch (a copy of production). If previews ever share the production database,
# remove "preview" below so unmerged branches can't change the production schema.
set -euo pipefail

case "${VERCEL_ENV:-}" in
  production | preview)
    echo "Applying database migrations (VERCEL_ENV=${VERCEL_ENV})..."
    npx prisma migrate deploy
    ;;
  *)
    echo "Skipping migrations (VERCEL_ENV=${VERCEL_ENV:-unset})."
    ;;
esac

npx prisma generate
npx next build
