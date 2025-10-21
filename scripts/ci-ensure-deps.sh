#!/usr/bin/env bash
set -euo pipefail

echo "[ci-ensure-deps] Starting"

# Only run on debian/ubuntu runners; detect by presence of apt-get
if command -v apt-get >/dev/null 2>&1; then
  echo "[ci-ensure-deps] Detected apt-based system"
  # Install minimal packages required for Chrome/Puppeteer if missing
  if ! command -v google-chrome-stable >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
    echo "[ci-ensure-deps] Installing google-chrome-stable and libs (this may take a while)"
    sudo apt-get update
    sudo apt-get install -y wget gnupg --no-install-recommends
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable || true
  else
    echo "[ci-ensure-deps] Chrome or Chromium already present"
  fi
else
  echo "[ci-ensure-deps] Non-apt runner; skipping system package install"
fi

echo "[ci-ensure-deps] Installing node modules (root and server)"
npm ci || true
npm --prefix server ci || true

echo "[ci-ensure-deps] Set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD if unset"
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:-true}

if [ -x "/usr/bin/google-chrome-stable" ]; then
  export CHROME_PATH=/usr/bin/google-chrome-stable
elif [ -x "/usr/bin/chromium-browser" ]; then
  export CHROME_PATH=/usr/bin/chromium-browser
fi

echo "[ci-ensure-deps] Done"
