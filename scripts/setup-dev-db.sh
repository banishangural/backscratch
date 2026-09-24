#!/usr/bin/env bash
# Dev only: install PostgreSQL if missing, start it, and create the app role + database.
# Safe to run repeatedly. Run it at the start of every cloud session (the container is ephemeral).
set -euo pipefail

DB_NAME="${DB_NAME:-backscratch}"
DB_USER="${DB_USER:-backscratch}"
DB_PASS="${DB_PASS:-backscratch_dev}" # local dev only, never used in production

if ! ls /usr/lib/postgresql/*/bin/postgres >/dev/null 2>&1; then
  echo "Installing PostgreSQL..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

echo "Starting PostgreSQL..."
service postgresql start >/dev/null

for _ in $(seq 1 30); do
  pg_isready -h localhost -q && break
  sleep 1
done
pg_isready -h localhost -q || { echo "PostgreSQL did not start"; exit 1; }

as_pg() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtA "$@"; }

if [ "$(as_pg -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")" != "1" ]; then
  # CREATEDB lets `prisma migrate dev` create its temporary shadow database
  as_pg -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}' CREATEDB"
fi

if [ "$(as_pg -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")" != "1" ]; then
  as_pg -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}"
fi

echo "Ready: postgresql://${DB_USER}:****@localhost:5432/${DB_NAME}"
