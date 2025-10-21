#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function run(url) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch (e) {
    try {
      const altPath = path.join(
        __dirname,
        "..",
        "client",
        "node_modules",
        "playwright"
      );
      if (fs.existsSync(path.join(__dirname, "..", "client", "node_modules"))) {
        playwright = require(altPath);
      } else {
        throw e;
      }
    } catch (err2) {
      console.error(
        "Playwright not found; install it or run from client/ node_modules"
      );
      process.exit(1);
    }
  }

  const browser = await playwright.chromium.launch({
    args: ["--no-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

    const btn = await page.$('[data-testid="load-demo"]');
    if (!btn) throw new Error("load-demo button not found");
    await btn.click();

    // Wait for the preview-ready attribute the app sets, or for the preview content selector
    try {
      await page.waitForFunction(
        () =>
          !!(
            document.body &&
            document.body.getAttribute &&
            document.body.getAttribute("data-preview-ready") === "1"
          ),
        { timeout: 8000 }
      );
    } catch (e) {
      // fallback: wait for selector
    }

    const sel = '[data-testid="preview-content"]';
    let found = null;
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      found = sel;
    } catch (e) {
      // selector not found; we'll try to read the global preview HTML as a fallback
    }

    const logsDir = path.join(__dirname, "..", "docs", "focus", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const ts = Date.now();
    const png = path.join(logsDir, `load-demo-snap-${ts}.png`);
    const htmlFile = path.join(logsDir, `load-demo-snap-${ts}.html`);

    await page.screenshot({ path: png, fullPage: true });

    if (found) {
      const content = await page.content();
      fs.writeFileSync(htmlFile, content, "utf8");
    } else {
      // attempt to read the test-visible global
      try {
        const glob = await page.evaluate(() => {
          try {
            return window && window["__LAST_PREVIEW_HTML"]
              ? window["__LAST_PREVIEW_HTML"]
              : null;
          } catch (e) {
            return null;
          }
        });
        if (glob) {
          fs.writeFileSync(htmlFile, String(glob), "utf8");
        } else {
          const content = await page.content();
          fs.writeFileSync(htmlFile, content, "utf8");
        }
      } catch (e) {
        const content = await page.content();
        fs.writeFileSync(htmlFile, content, "utf8");
      }
    }

    console.log("Wrote screenshot to", png);
    console.log("Wrote HTML snapshot to", htmlFile);
  } finally {
    await browser.close();
  }
}

const raw = process.argv.slice(2);
let url = "http://localhost:5173";
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === "--url" && raw[i + 1]) {
    url = raw[i + 1];
    break;
  }
}

run(url).catch((err) => {
  console.error(err);
  process.exit(1);
});
