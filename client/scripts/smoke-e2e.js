#!/usr/bin/env node
// client/scripts/smoke-e2e.js
// Headless smoke test: load the Vite dev URL, click demo -> export, save PDF artifact

const fs = require("fs");
const path = require("path");
const http = require("http");

const DEFAULT_VITE_URL = process.env.VITE_URL || "http://localhost:5173";
const OUTPUT_DIR =
  process.env.OUT_DIR ||
  path.resolve(process.cwd(), "..", "client", "test-artifacts");

(async () => {
  try {
    if (!fs.existsSync(OUTPUT_DIR))
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Try to use puppeteer-core + CHROME_PATH if available
    const chromePath = process.env.CHROME_PATH || process.env.CHROME_BIN;
    let puppeteer;
    if (chromePath) {
      puppeteer = require("puppeteer-core");
    } else {
      try {
        puppeteer = require("puppeteer-core");
      } catch (e) {
        console.warn(
          "puppeteer-core not installed or CHROME_PATH not set — falling back to HTTP checks"
        );
        puppeteer = null;
      }
    }

    if (puppeteer && chromePath) {
      console.log("Running headless smoke test with puppeteer-core");
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.goto(DEFAULT_VITE_URL, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Click load demo
      await page.waitForSelector('[data-testid="load-demo"]', {
        timeout: 15000,
      });
      await page.click('[data-testid="load-demo"]');

      // Click Run smoke test
      await page.waitForSelector('[data-testid="smoke-button"]', {
        timeout: 15000,
      });
      await page.click('[data-testid="smoke-button"]');

      // Wait a short while for download to start; intercept response via request
      // Note: Puppeteer download handling varies; we'll capture network response to /export
      const exportResp = await page.waitForResponse(
        (resp) => resp.url().includes("/export") && resp.status() === 200,
        { timeout: 30000 }
      );
      const buffer = await exportResp.buffer();
      const outPath = path.join(
        OUTPUT_DIR,
        `tmp-smoke-export-${Date.now()}.pdf`
      );
      fs.writeFileSync(outPath, buffer);
      console.log("Saved export to", outPath);
      await browser.close();
      process.exit(0);
    }

    // Fallback: call server endpoints directly (preview -> export)
    console.log("Running fallback smoke test (HTTP only)");

    // Load demo: since the demo is client-side, we POST content directly to /export as a sanity check
    const demo = {
      title: "Smoke Demo",
      body: '<div style="page-break-after:always;padding:48px;"><h1>Smoke Poem</h1><pre>Test</pre></div>',
    };

    const postData = JSON.stringify(demo);
    const url = new URL("/export", DEFAULT_VITE_URL);

    const opts = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        if (
          res.headers["content-type"] &&
          res.headers["content-type"].includes("application/pdf")
        ) {
          const buf = Buffer.concat(chunks);
          const outPath = path.join(
            OUTPUT_DIR,
            `tmp-smoke-export-${Date.now()}.pdf`
          );
          fs.writeFileSync(outPath, buf);
          console.log("Saved export to", outPath);
          process.exit(0);
        } else {
          const diag = {
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8").slice(0, 4096),
          };
          const outPath = path.join(
            OUTPUT_DIR,
            `diagnostic-${Date.now()}.json`
          );
          fs.writeFileSync(outPath, JSON.stringify(diag, null, 2));
          console.log(
            "Export did not return PDF, diagnostic saved to",
            outPath
          );
          process.exit(2);
        }
      });
    });

    req.on("error", (err) => {
      const outPath = path.join(OUTPUT_DIR, `diagnostic-${Date.now()}.json`);
      fs.writeFileSync(
        outPath,
        JSON.stringify({ error: String(err) }, null, 2)
      );
      console.error("Request failed, diagnostic saved to", outPath);
      process.exit(2);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error("Smoke test failed", err);
    process.exit(2);
  }
})();
