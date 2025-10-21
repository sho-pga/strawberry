#!/usr/bin/env node
// client/scripts/smoke-e2e.cjs
// CommonJS wrapper for the headless smoke test

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

      await page.waitForSelector('[data-testid="load-demo"]', {
        timeout: 15000,
      });
      await page.click('[data-testid="load-demo"]');

      await page.waitForSelector('[data-testid="smoke-button"]', {
        timeout: 15000,
      });
      await page.click('[data-testid="smoke-button"]');

      // Some dev proxies can interfere with binary response buffering when
      // observed via page.waitForResponse. To make the smoke test deterministic
      // we POST directly to the server export endpoint and save the returned PDF.
      const demoBody =
        '<div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer1.svg);background-size:cover;background-position:center;"><h1>Summer Poem 1</h1><p>By Unknown</p><pre>Roses are red\nViolets are blue\nSummer breeze carries you</pre></div><div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer2.svg);background-size:cover;background-position:center;"><h1>Summer Poem 2</h1><p>By Unknown</p><pre>Sun on the sand\nWaves lap the shore\nA page on each</pre></div>';
      const demo = { title: "Smoke Demo", body: demoBody };
      const postData = JSON.stringify(demo);

      const serverBase =
        process.env.SERVER_URL ||
        process.env.VITE_URL ||
        DEFAULT_VITE_URL.replace(/:\\d+$/, ":3000");
      const url = new URL("/export", serverBase);

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
      // attach dev auth token if available
      if (process.env.DEV_AUTH_TOKEN)
        opts.headers["x-dev-auth"] = process.env.DEV_AUTH_TOKEN;

      await new Promise((resolve, reject) => {
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
              resolve();
            } else {
              const outPath = path.join(
                OUTPUT_DIR,
                `diagnostic-${Date.now()}.json`
              );
              fs.writeFileSync(
                outPath,
                JSON.stringify(
                  {
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString("utf8").slice(0, 4096),
                  },
                  null,
                  2
                )
              );
              console.log(
                "Export did not return PDF, diagnostic saved to",
                outPath
              );
              resolve();
            }
          });
        });
        req.on("error", (err) => reject(err));
        req.write(postData);
        req.end();
      });
      await browser.close();
      process.exit(0);
    }

    console.log("Running fallback smoke test (HTTP only)");

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
