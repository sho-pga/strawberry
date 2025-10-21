#!/usr/bin/env node
// Lightweight headless script that exercises the preview endpoint via HTTP
// and optionally opens the preview HTML in Puppeteer for a DOM snapshot.

const fs = require("fs");
const path = require("path");
let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch (e) {
  puppeteer = null;
}

async function run() {
  const previewUrl =
    "http://localhost:3000/preview?content=" +
    encodeURIComponent(
      JSON.stringify({ title: "E2E Test", body: "This is a preview test." })
    );

  console.log("Fetching preview URL:", previewUrl);
  const res = await fetch(previewUrl);
  if (!res.ok) {
    console.error("Preview request failed:", res.status);
    process.exit(2);
  }

  const html = await res.text();
  const outDir = path.resolve(process.cwd(), "test-artifacts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "preview.html"), html, "utf8");
  console.log("Saved preview HTML to test-artifacts/preview.html");

  // Try to open in Puppeteer for a DOM snapshot if puppeteer-core is available and Chrome is present
  if (!puppeteer) {
    console.warn("puppeteer-core not installed; skipping Puppeteer snapshot");
    return;
  }

  const possible = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
  ];
  let executablePath = possible.find((p) => p && fs.existsSync(p));
  if (!executablePath) {
    console.warn("No Chrome executable found; skipping Puppeteer snapshot");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  // Wait for the preview-content to appear using data-testid for stability.
  // Retry a few times with short backoff before giving up and dumping DOM for debugging.
  const maxAttempts = 5;
  let attempt = 0;
  let found = false;
  while (attempt < maxAttempts && !found) {
    try {
      await page.waitForSelector('[data-testid="preview-content"]', {
        timeout: 1000,
      });
      found = true;
      break;
    } catch (e) {
      attempt += 1;
      // small backoff
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }

  const snapshot = await page.evaluate(
    () => document.documentElement.outerHTML
  );
  if (!found) {
    console.warn(
      "preview-content not found after retries; snapshot saved for debugging"
    );
  }
  fs.writeFileSync(path.join(outDir, "snapshot.html"), snapshot, "utf8");
  console.log("Saved DOM snapshot to test-artifacts/snapshot.html");
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
