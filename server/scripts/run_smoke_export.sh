#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the top-level puppeteer smoke script while ensuring
# server/node_modules is on NODE_PATH so `puppeteer-core` resolves.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export NODE_PATH="$SERVER_ROOT/node_modules"

# Allow callers to override CHROME_PATH; fallback to a common path
export CHROME_PATH="${CHROME_PATH:-/usr/bin/google-chrome-stable}"

# Call the local server puppeteer smoke script
node "$SCRIPT_DIR/puppeteer_smoke_export.js"

# If the puppeteer script wrote any PDFs into /tmp or other known locations,
# copy them into server/test-artifacts so the workflow artifact step can pick them up.
ARTIFACT_DIR="$SERVER_ROOT/test-artifacts"
mkdir -p "$ARTIFACT_DIR"
shopt -s nullglob || true
for f in /tmp/*automated_export_*.pdf /tmp/*export*.pdf; do
	if [ -f "$f" ]; then
		cp -v "$f" "$ARTIFACT_DIR/"
	fi
done
