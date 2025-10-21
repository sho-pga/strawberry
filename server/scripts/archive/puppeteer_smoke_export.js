#!/usr/bin/env node
// Small puppeteer-core smoke test that uses CHROME_PATH to render a page to PDF.
// Run in the devcontainer after dependencies are installed: node scripts/puppeteer_smoke_export.js

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

async function run() {
  const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
  if (!fs.existsSync(chromePath)) {
    console.error("Chrome binary not found at", chromePath);
    process.exit(2);
  }

  const outDir = path.join(__dirname, "..", "samples");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "puppeteer_smoke_test.pdf");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(
      "<html><body><h1>Puppeteer smoke test</h1><p>If you see this in a PDF, it worked.</p></body></html>"
    );
    await page.pdf({ path: outFile, format: "A4" });
    console.log("PDF written to", outFile);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error("Puppeteer smoke test failed:", err);
    await browser.close();
    process.exit(3);
  }
}

run();
