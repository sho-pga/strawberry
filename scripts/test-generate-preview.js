#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function run(
  url,
  promptText = "A short summer poem about cicadas and long shadows."
) {
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
    prompt: promptText,
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

    // Fill prompt textarea
    const textarea = await page.$('[data-testid="prompt-textarea"]');
    if (!textarea) {
      result.errors.push("prompt-textarea not found");
    } else {
      await textarea.fill(promptText);
    }

    const genBtn = await page.$('[data-testid="generate-button"]');
    if (!genBtn) {
      result.errors.push("generate button not found");
    } else {
      await genBtn.click();

      // Prefer the combined selector that signals the preview node is ready
      let found = null;
      const combinedSel =
        '[data-testid="preview-content"][data-preview-ready="1"]';
      try {
        await page.waitForSelector(combinedSel, { timeout: 12000 });
        // small buffer for rendering
        await page.waitForTimeout(200);
        found = combinedSel;
      } catch (e) {
        // fallback: try console instrumentation, body flag, then preview-content innerHTML
        try {
          await page.waitForEvent("console", {
            timeout: 8000,
            predicate: (msg) => {
              try {
                return (
                  msg.text &&
                  msg.text().includes("PreviewWindow: previewStore updated")
                );
              } catch (ee) {
                return false;
              }
            },
          });
          await page.waitForTimeout(250);
        } catch (ee) {}

        try {
          await page.waitForFunction(
            () =>
              !!(
                document.body &&
                document.body.getAttribute &&
                document.body.getAttribute("data-preview-ready") === "1"
              ),
            { timeout: 12000 }
          );
          await page.waitForTimeout(250);
        } catch (ee) {}

        try {
          const sel = '[data-testid="preview-content"]';
          await page.waitForSelector(sel, { timeout: 12000 });
          await page.waitForFunction(
            (s) => {
              const el = document.querySelector(s);
              return el && el.innerHTML && el.innerHTML.trim().length > 20;
            },
            { timeout: 8000 },
            sel
          );
          found = sel;
        } catch (ee) {
          // fallback to global or body later
        }
      }

      result.observations.previewSelectorFound = found;
      if (found) {
        let html = await page
          .$eval(found, (el) => el.innerHTML)
          .catch(() => null);
        // If innerHTML looks like the placeholder or is too small, prefer the global fallback
        const smallOrPlaceholder =
          !html ||
          html.trim().length < 40 ||
          html.includes("Your generated preview will appear here");
        if (smallOrPlaceholder) {
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
            if (glob) html = String(glob);
          } catch (e) {}
        }
        result.observations.previewHtml = html
          ? String(html).slice(0, 2000)
          : null;
      } else {
        try {
          // attempt a screenshot for diagnostics
          const ssPath = path.join(
            logsDir,
            `generate-preview-${Date.now()}.png`
          );
          await page
            .screenshot({ path: ssPath, fullPage: true })
            .catch(() => {});
          result.observations.screenshot = ssPath;
        } catch (e) {}

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
          if (glob)
            result.observations.previewHtmlFromGlobal = glob
              ? String(glob).slice(0, 2000)
              : null;
        } catch (e) {}
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
    const out = path.join(logsDir, `generate-preview-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log("Wrote report to", out);
    return result;
  }
}

const raw = process.argv.slice(2);
let url = "http://localhost:5173";
let prompt = null;
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === "--url" && raw[i + 1]) {
    url = raw[i + 1];
  }
  if (raw[i] === "--prompt" && raw[i + 1]) {
    prompt = raw[i + 1];
  }
}

run(url, prompt || undefined).then((r) => {
  if (r.errors && r.errors.length) process.exitCode = 2;
});
