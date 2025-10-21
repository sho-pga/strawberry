#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function run(url) {
  // Load Playwright at runtime so the script can be run from client/ where
  // Playwright is installed as a devDependency.
  let playwright;
  try {
    playwright = require("playwright");
  } catch (e) {
    // Fall back to client/node_modules if Playwright is installed there
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
        "Playwright not found. Run this script from the client/ dir or install Playwright."
      );
      throw e;
    }
  }

  const browser = await playwright.chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  const result = {
    url,
    timestamp: new Date().toISOString(),
    errors: [],
    observations: {},
    console: [],
    network: [],
  };

  page.on("console", (msg) => {
    try {
      result.console.push({ type: msg.type(), text: msg.text() });
    } catch (e) {}
  });

  page.on("requestfinished", async (req) => {
    try {
      const res = req.response();
      result.network.push({
        url: req.url(),
        method: req.method(),
        status: res ? res.status() : null,
      });
    } catch (e) {}
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

    // Click the Summer suggestion button
    const btn = await page.$('[data-testid="summer-suggestion"]');
    if (!btn) {
      result.errors.push("summer-suggestion button not found");
    } else {
      await btn.click();
      await page.waitForTimeout(300);

      // read textarea
      const val = await page
        .$eval("#prompt-textarea", (el) => el.value)
        .catch(() => null);
      const focused = await page.evaluate(
        () =>
          document.activeElement &&
          document.activeElement.id === "prompt-textarea"
      );
      result.observations.textareaValue = val;
      result.observations.textareaFocused = Boolean(focused);
    }
  } catch (err) {
    result.errors.push(err && err.message ? err.message : String(err));
  } finally {
    await browser.close();
    const logsDir = path.join(__dirname, "..", "docs", "focus", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const out = path.join(logsDir, `summer-suggestion-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log("Wrote report to", out);
    return result;
  }
}

// Simple arg parsing to avoid adding dependencies
const raw = process.argv.slice(2);
let url = "http://localhost:5173";
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === "--url" && raw[i + 1]) {
    url = raw[i + 1];
    break;
  }
}

// Run from client/ so Playwright resolves from client/node_modules
run(url).then((r) => {
  if (r.errors.length) process.exitCode = 2;
});
