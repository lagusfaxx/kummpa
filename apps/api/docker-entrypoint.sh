#!/bin/sh
set -eu

export API_PORT="${PORT:-${API_PORT:-4000}}"
export PRISMA_MIGRATE_ON_START="${PRISMA_MIGRATE_ON_START:-true}"
export PRISMA_MIGRATE_MAX_ATTEMPTS="${PRISMA_MIGRATE_MAX_ATTEMPTS:-10}"
export PRISMA_MIGRATE_DELAY_SECONDS="${PRISMA_MIGRATE_DELAY_SECONDS:-5}"

if [ "$PRISMA_MIGRATE_ON_START" = "true" ]; then
  attempt=1

  while [ "$attempt" -le "$PRISMA_MIGRATE_MAX_ATTEMPTS" ]; do
    echo "Running prisma migrate deploy (attempt ${attempt}/${PRISMA_MIGRATE_MAX_ATTEMPTS})..."

    if ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma; then
      echo "Prisma migrations applied successfully."
      break
    fi

    if [ "$attempt" -eq "$PRISMA_MIGRATE_MAX_ATTEMPTS" ]; then
      echo "Prisma migrations failed after ${PRISMA_MIGRATE_MAX_ATTEMPTS} attempts."
      exit 1
    fi

    echo "Migration attempt failed. Retrying in ${PRISMA_MIGRATE_DELAY_SECONDS}s..."
    attempt=$((attempt + 1))
    sleep "$PRISMA_MIGRATE_DELAY_SECONDS"
  done
else
  echo "Skipping prisma migrate deploy because PRISMA_MIGRATE_ON_START=${PRISMA_MIGRATE_ON_START}."
fi

exec node apps/api/dist/server.js
