#!/usr/bin/env node
// Lightweight headless script that exercises the preview endpoint via HTTP
// and optionally opens the preview HTML in Puppeteer for a DOM snapshot.

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

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

  // Try to open in Puppeteer for a DOM snapshot if Chrome is available
  const possible = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
  ];
  let executablePath = possible.find((p) => p && fs.existsSync(p));
  if (!executablePath) {
    console.warn("No Chrome executable found; skipping Puppeteer snapshot");
    process.exit(0);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const snapshot = await page.evaluate(
      () => document.documentElement.outerHTML
    );
    fs.writeFileSync(path.join(outDir, "snapshot.html"), snapshot, "utf8");
    console.log("Saved DOM snapshot to test-artifacts/snapshot.html");
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
