#!/usr/bin/env bash
set -euo pipefail

# Simple devcontainer smoke checks
# - Verifies required env vars
# - Checks server /health endpoint
# - Attempts a psql connection to the named DB host
# Usage: ./scripts/devcontainer_smoke_health.sh

REQUIRED=(POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB)
MISSING=()
for v in "${REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then
    MISSING+=("$v")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "Missing required env vars: ${MISSING[*]}"
  echo "Copy .env.example to .env and fill values, or export them in your Codespace/devcontainer."
  exit 2
fi

# Default targets
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "Checking server health at: $HEALTH_URL"
if curl -fsS "$HEALTH_URL" -m 10 >/dev/null; then
  echo "OK: /health returned success"
else
  echo "WARN: /health did not return success (service may still be starting or not running)"
fi

# Check DB connectivity using psql (postgres client should be available in the devcontainer)
echo "Checking Postgres connectivity to ${DB_HOST}:${DB_PORT} as ${POSTGRES_USER}..."
if command -v psql >/dev/null 2>&1; then
  if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' >/dev/null 2>&1; then
    echo "OK: Connected to Postgres database"
  else
    echo "ERROR: Unable to connect to Postgres with provided credentials/host"
    echo "Check that the 'db' service is running and env vars match docker-compose/.env"
    exit 3
  fi
else
  echo "psql client not found in PATH. Install postgresql-client in the devcontainer to enable DB checks."
fi

# Print Chrome path diagnostics
echo "CHROME_PATH=${CHROME_PATH:-<not set>}"
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:-<not set>}"

echo "Devcontainer smoke checks complete. If /health is failing, start the devservers (see .devcontainer postAttachCommand)."
