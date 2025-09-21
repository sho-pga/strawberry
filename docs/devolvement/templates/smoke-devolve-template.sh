#!/usr/bin/env bash
set -euo pipefail

# Template smoke script for devolved branches.
# Usage: copy this file into your branch as `scripts/smoke-devolve-<NN>.sh` and adjust as needed.

PORT=${PORT:-3000}
SERVER_START_CMD=${SERVER_START_CMD:-"node server/index.js"}
ENV_VARS=${ENV_VARS:-"SKIP_PUPPETEER=1"}

echo "Starting server (env: ${ENV_VARS})..."
eval ${ENV_VARS} ${SERVER_START_CMD} &
SERVER_PID=$!
trap "kill $SERVER_PID" EXIT

echo "Waiting for server to become responsive..."
sleep 2

echo "Posting test prompt..."
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:${PORT}/prompt?min_flow=1" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"devolve smoke test"}')

echo "HTTP status: $HTTP_STATUS"
if [ "$HTTP_STATUS" != "200" ]; then
  echo "Smoke test failed: non-200 response"
  exit 2
fi

if [ -f samples/latest_prompt.txt ]; then
  echo "samples/latest_prompt.txt exists. Content:";
  head -n 5 samples/latest_prompt.txt || true
else
  echo "samples/latest_prompt.txt missing"
  exit 3
fi

echo "Smoke test passed"
