#!/bin/bash
set -e

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 1. Check for Google Chrome
if command_exists google-chrome-stable; then
  echo "Google Chrome is already installed."
else
  echo "Google Chrome not found. Installing..."
  sudo apt-get update
  sudo apt-get install -y wget gnupg --no-install-recommends
  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
  sudo apt-get update
  sudo apt-get install -y google-chrome-stable
fi

# 2. Set and export CHROME_PATH
CHROME_PATH_VAR=$(command -v google-chrome-stable)
echo "CHROME_PATH=${CHROME_PATH_VAR}" >> $GITHUB_ENV
echo "Chrome path set to: ${CHROME_PATH_VAR}"

# 3. Set and export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> $GITHUB_ENV
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD set to true."
