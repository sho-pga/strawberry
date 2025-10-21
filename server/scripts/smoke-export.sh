#!/usr/bin/env bash
# Smoke test: request multi-poem export and save to /tmp/ebook.pdf
set -euo pipefail

HOST=${HOST:-http://localhost:3000}
# Default to a unique temp file to avoid collisions in concurrent runs
TMPDIR=$(mktemp -d 2>/dev/null || echo "/tmp")
OUT=${OUT:-"$TMPDIR/ebook.pdf"}
# Resolve script directory and locate samples reliably (works when invoked via npm --prefix)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
JSON_FILE=${JSON_FILE:-"$SCRIPT_DIR/../samples/poems.json"}

if [ ! -f "$JSON_FILE" ]; then
  echo "Missing sample JSON: $JSON_FILE"
  exit 1
fi

echo "Waiting 2s for server to settle..."
sleep 2

echo "Requesting export from $HOST/api/export/book"
RESP_CODE=$(curl -s -w "%{http_code}" -o "$OUT" -X POST "$HOST/api/export/book" -H "Content-Type: application/json" --data @"$JSON_FILE")

if [ "$RESP_CODE" = "200" ] || [ "$RESP_CODE" = "201" ]; then
  echo "Export saved to $OUT"
  ls -lh "$OUT" || true
  file "$OUT" || true
  # Verify the saved file is a PDF by checking the magic bytes (%PDF-)
  if head -c 5 "$OUT" | grep -q "%PDF-"; then
    echo "PDF magic bytes verified"
    exit 0
  else
    echo "Saved file does not appear to be a valid PDF (missing %PDF- header)"
    # Print first 200 bytes for debugging
    echo "First bytes of file:" 
    head -c 200 "$OUT" | sed -n '1,4p' | sed -n '1,200p' || true
    exit 3
  fi
fi

echo "Export failed with HTTP $RESP_CODE"
exit 2
