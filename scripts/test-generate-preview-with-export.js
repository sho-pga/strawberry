#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function run(url) {
  const playwright = require("playwright");
  const browser = await playwright.chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  const result = {
    url,
    timestamp: new Date().toISOString(),
    events: [],
    errors: [],
  };

  page.on("console", (msg) => {
    try {
      result.events.push({ type: msg.type(), text: msg.text() });
    } catch (e) {}
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Fill prompt and click Generate
    const textarea = await page.$('[data-testid="prompt-textarea"]');
    if (!textarea) {
      result.errors.push("prompt-textarea not found");
    } else {
      await textarea.fill(
        "A short summer poem about cicadas and long shadows."
      );
    }

    const genBtn = await page.$('[data-testid="generate-button"]');
    if (!genBtn) {
      result.errors.push("generate button not found");
    } else {
      await genBtn.click();
    }

    // Wait for preview-ready
    const combinedSel =
      '[data-testid="preview-content"][data-preview-ready="1"]';
    try {
      await page.waitForSelector(combinedSel, { timeout: 15000 });
      result.events.push({
        type: "info",
        text: "preview-ready selector found",
      });
    } catch (e) {
      result.errors.push("preview-ready selector not found within timeout");
    }

    // Click Run smoke test (export)
    const smokeBtn = await page.$('[data-testid="smoke-button"]');
    if (!smokeBtn) {
      result.errors.push("smoke-button not found");
    } else {
      await smokeBtn.click();
      // Wait for console indication of success or failure
      try {
        await page.waitForFunction(
          () => {
            try {
              return window && window.__LAST_PREVIEW_HTML;
            } catch (e) {
              return false;
            }
          },
          { timeout: 20000 }
        );
      } catch (e) {}

      // Also wait for specific console messages
      try {
        await page.waitForEvent("console", {
          timeout: 20000,
          predicate: (msg) => {
            try {
              const text = msg.text();
              return (
                text &&
                (text.includes("Smoke test succeeded") ||
                  text.includes("diagnostic") ||
                  text.includes("PDF exported successfully") ||
                  text.includes("Smoke test failed"))
              );
            } catch (e) {
              return false;
            }
          },
        });
      } catch (e) {
        // no special console message; collect what we have
      }
    }
  } catch (err) {
    result.errors.push(err && err.message ? err.message : String(err));
  } finally {
    await browser.close();
    const logsDir = path.join(__dirname, "..", "docs", "focus", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const out = path.join(
      logsDir,
      `generate-preview-export-${Date.now()}.json`
    );
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log("Wrote report to", out);
    return result;
  }
}

const raw = process.argv.slice(2);
let url = "http://localhost:5173";
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === "--url" && raw[i + 1]) url = raw[i + 1];
}

run(url).then((r) => {
  if (r.errors && r.errors.length) process.exitCode = 2;
});
