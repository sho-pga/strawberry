```bash
#!/usr/bin/env bash
# Template smoke script to run server in WORKER_INLINE mode and POST a prompt

PORT=${PORT:-3000}
ENV_VARS=${ENV_VARS:-"DEV_MINIMAL=1 WORKER_INLINE=1 SKIP_PUPPETEER=1"}

echo "Starting server: ${ENV_VARS} node server/index.js"
${ENV_VARS} node server/index.js &
PID=$!
trap "kill $PID" EXIT
sleep 2

curl -X POST "http://localhost:${PORT}/prompt?min_flow=1" -H 'Content-Type: application/json' -d '{"prompt":"smoke 02"}'

if [ -f samples/latest_prompt.txt ]; then
  echo "samples/latest_prompt.txt found"
else
  echo "missing samples/latest_prompt.txt"
  exit 2
fi

```
