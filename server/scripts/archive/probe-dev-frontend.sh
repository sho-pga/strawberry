#!/usr/bin/env bash
set -euo pipefail
# Probe the running dev environment: waits for backend health and frontend root, then POSTs to preview endpoint
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3000/health}"
FRONTEND_ROOT_URL="${FRONTEND_ROOT_URL:-http://localhost:5173/}"
PREVIEW_URL="${PREVIEW_URL:-http://localhost:3000/preview}"
MAX_RETRIES="${MAX_RETRIES:-60}"
RETRY_INTERVAL="${RETRY_INTERVAL:-1}"

echo "Waiting for backend health..."
attempts=0
while [ $attempts -lt $MAX_RETRIES ]; do
  if curl -sSf "$BACKEND_HEALTH_URL" | grep -q '"status": "ok"'; then
    echo "✓ Backend ready"
    break
  fi
  attempts=$((attempts + 1))
  echo "Attempt $attempts/$MAX_RETRIES: Backend not ready, waiting..."
  sleep $RETRY_INTERVAL
done

if [ $attempts -eq $MAX_RETRIES ]; then
  echo "✗ Backend health check failed after $MAX_RETRIES attempts"
  exit 1
fi

echo "Waiting for frontend root..."
attempts=0
while [ $attempts -lt $((MAX_RETRIES / 2)) ]; do
  if curl -sSf "$FRONTEND_ROOT_URL" >/dev/null 2>&1; then
    echo "✓ Frontend ready"
    break
  fi
  attempts=$((attempts + 1))
  echo "Attempt $attempts/$((MAX_RETRIES / 2)): Frontend not ready, waiting..."
  sleep $RETRY_INTERVAL
done

if [ $attempts -eq $((MAX_RETRIES / 2)) ]; then
  echo "✗ Frontend health check failed after $((MAX_RETRIES / 2)) attempts"
  exit 1
fi

# Test preview endpoint with sample content
echo "Testing preview endpoint..."
SAMPLE_CONTENT='{
  "title": "Health Check",
  "body": "Automated health check from probe script."
}'
ENCODED_CONTENT=$(echo "$SAMPLE_CONTENT" | base64 -w 0)
curl -i -s -X GET "$PREVIEW_URL?content=$ENCODED_CONTENT" -H "Content-Type: application/json" -D /tmp/probe-headers.txt -o /tmp/probe-body.txt || true

echo "--- Response headers ---"
sed -n '1,200p' /tmp/probe-headers.txt || true

echo "--- Response body ---"
sed -n '1,200p' /tmp/probe-body.txt || true

echo "Done"
