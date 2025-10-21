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
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const btn = await page.$('[data-testid="load-demo"]');
    if (!btn) {
      result.errors.push("load-demo button not found");
    } else {
      await btn.click();

      // First, wait for a diagnostic console message from the app that the preview store updated.
      // This gives us a reliable synchronization point when the app instrumentation is present.
      try {
        await page.waitForEvent("console", {
          timeout: 8000,
          predicate: (msg) => {
            try {
              return (
                msg.text &&
                msg.text().includes("PreviewWindow: previewStore updated")
              );
            } catch (e) {
              return false;
            }
          },
        });
        // small additional wait to allow DOM to render
        await page.waitForTimeout(250);
      } catch (e) {
        // console signal not observed in time; continue to DOM-based waits/fallbacks
      }

      // Try to enable auto-preview and click the Preview Now button to force rendering
      try {
        const auto = await page.$('[data-testid="auto-preview-checkbox"]');
        if (auto) {
          const checked = (await auto.isChecked)
            ? await auto.isChecked()
            : null;
          // Use click to toggle on if present and not already checked
          if (checked === false) await auto.click();
        }
      } catch (e) {}

      try {
        const previewNow = await page.$('[data-testid="preview-now-button"]');
        if (previewNow) {
          await previewNow.click();
        }
      } catch (e) {}

      // First, wait for the DOM-visible instrumentation the app now sets when preview is ready.
      // This attribute is short-lived; use it as a reliable sync point when available.
      try {
        await page.waitForFunction(
          () =>
            !!(
              document.body &&
              document.body.getAttribute &&
              document.body.getAttribute("data-preview-ready") === "1"
            ),
          { timeout: 10000 }
        );
        // small additional wait to allow the component to render
        await page.waitForTimeout(300);
      } catch (e) {
        // attribute not observed in time; continue to selector-based waits
      }

      // Wait for the preview element used by the app and ensure it has content.
      // This avoids brittle short timeouts and selector mismatches.
      let found = null;
      try {
        // wait for the specific test id the preview component uses
        const sel = '[data-testid="preview-content"]';
        await page.waitForSelector(sel, { timeout: 12000 });

        // additionally wait until the innerHTML is non-empty or reasonably sized
        await page.waitForFunction(
          (s) => {
            const el = document.querySelector(s);
            return el && el.innerHTML && el.innerHTML.trim().length > 20;
          },
          { timeout: 8000 },
          sel
        );

        found = sel;
      } catch (e) {
        // not found in time; fall back to scanning common selectors and body
        const previewSelectors = [
          '[data-testid="preview-frame"]',
          ".preview",
          "#preview",
          ".preview-pane",
        ];
        for (const sel of previewSelectors) {
          const el = await page.$(sel);
          if (el) {
            found = sel;
            break;
          }
        }
      }

      result.observations.previewSelectorFound = found;

      if (found) {
        const html = await page
          .$eval(found, (el) => el.innerHTML)
          .catch(() => null);
        result.observations.previewHtml = html ? html.slice(0, 2000) : null;
      } else {
        // attempt to read a test-visible global the app now sets when preview is ready
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
            result.observations.previewHtmlFromGlobal = glob
              ? String(glob).slice(0, 2000)
              : null;
          }
        } catch (e) {}

        // attempt to read the preview iframe or main content area as a last resort
        const bodyHtml = await page
          .$eval("body", (b) => b.innerHTML)
          .catch(() => null);
        result.observations.bodySnippet = bodyHtml
          ? bodyHtml.slice(0, 2000)
          : null;
      }
    }
  } catch (err) {
    result.errors.push(err && err.message ? err.message : String(err));
  } finally {
    await browser.close();
    const logsDir = path.join(__dirname, "..", "docs", "focus", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const out = path.join(logsDir, `load-demo-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log("Wrote report to", out);
    return result;
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

run(url).then((r) => {
  if (r.errors.length) process.exitCode = 2;
});
