#!/usr/bin/env bash
set -euo pipefail

# Frontend health check script
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-1}"
VERBOSE="${VERBOSE:-0}"

log() {
  local level=$1
  shift
  if [[ $VERBOSE -eq 1 || $level == "ERROR" ]]; then
    echo "[$level] $*"
  fi
}

check_frontend() {
  log "INFO" "Checking frontend at $FRONTEND_URL"
  
  local attempts=0
  while [ $attempts -lt $MAX_RETRIES ]; do
    if curl -sSf "$FRONTEND_URL" >/dev/null 2>&1; then
      log "INFO" "✓ Frontend is responding"
      return 0
    fi
    attempts=$((attempts + 1))
    log "INFO" "Attempt $attempts/$MAX_RETRIES: Frontend not ready..."
    sleep $RETRY_INTERVAL
  done

  log "ERROR" "✗ Frontend health check failed after $MAX_RETRIES attempts"
  return 1
}

# Run checks
if check_frontend; then
  log "INFO" "All frontend checks passed"
  exit 0
else
  log "ERROR" "One or more frontend checks failed"
  exit 1
fi
