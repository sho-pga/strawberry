#!/usr/bin/env bash
set -eu

# Lightweight CI smoke test for Generate -> Preview flow
# Places:
# - POST /prompt?dev=true  -> expects JSON with either { content } or { data: { content } }
# - GET /preview?content=<urlencoded JSON content> -> expects HTML response (contains <html> or <div>)
# - Fallback: POST /api/preview with JSON { content } -> expects HTML in response

# Usage:
#  ./scripts/ci-smoke-test.sh http://localhost:3000
# or in CI: export BASE_URL and run

BASE_URL=${1:-${BASE_URL:-http://localhost:3000}}
CURL=${CURL:-curl}
JQ=${JQ:-jq}

echo "Using base URL: $BASE_URL"

# 1) POST /prompt?dev=true
RESP=$($CURL -sS -X POST "$BASE_URL/prompt?dev=true" -H 'Content-Type: application/json' -d '{"prompt":"smoke test prompt"}')

if [ -z "$RESP" ]; then
  echo "ERROR: empty response from POST /prompt?dev=true"
  exit 1
fi

# Try to extract content from either shape
CONTENT=$($JQ -r '.content // .data.content // empty' <<<"$RESP" || true)

if [ -z "$CONTENT" ] || [ "$CONTENT" = "null" ]; then
  echo "ERROR: response did not contain content. Full response:\n$RESP"
  exit 1
fi

# Validate required fields
TITLE=$($JQ -r '.title // empty' <<<"$CONTENT" || true)
BODY=$($JQ -r '.body // empty' <<<"$CONTENT" || true)

if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
  echo "ERROR: content missing title/body. Content: $CONTENT"
  exit 1
fi

echo "PASS: POST /prompt returned content with title and body. title='$TITLE'"

# 2) Try GET /preview?content=<encoded>
ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read()))" <<<"$CONTENT")

PREVIEW_HTML=$($CURL -sS -G "$BASE_URL/preview" --data-urlencode "content=$CONTENT" || true)

if [ -n "$PREVIEW_HTML" ] && (grep -qiE '<html|<div|<!DOCTYPE html' <<<"$PREVIEW_HTML"); then
  echo "PASS: GET /preview returned HTML (via query param)."
  exit 0
fi

# 3) Fallback: POST /api/preview with JSON body
API_PREVIEW_HTML=$($CURL -sS -X POST "$BASE_URL/api/preview" -H 'Content-Type: application/json' -d "{\"content\": $CONTENT}" || true)

if [ -n "$API_PREVIEW_HTML" ] && (grep -qiE '<html|<div|<!DOCTYPE html' <<<"$API_PREVIEW_HTML"); then
  echo "PASS: POST /api/preview returned HTML."
  exit 0
fi

# If we got here, previews failed
cat <<EOF
ERROR: Preview endpoints did not return HTML.
- GET /preview returned: '$PREVIEW_HTML'
- POST /api/preview returned: '$API_PREVIEW_HTML'
Full content object used: $CONTENT
Full prompt response: $RESP
EOF

exit 2
