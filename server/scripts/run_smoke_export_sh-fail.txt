#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the top-level puppeteer smoke script while ensuring
# server/node_modules is on NODE_PATH so `puppeteer-core` resolves.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export NODE_PATH="$SERVER_ROOT/node_modules"

# Allow callers to override CHROME_PATH; fallback to a common path
export CHROME_PATH="${CHROME_PATH:-/usr/bin/google-chrome-stable}"

node "$SERVER_ROOT/../scripts/puppeteer_smoke_export.js"
