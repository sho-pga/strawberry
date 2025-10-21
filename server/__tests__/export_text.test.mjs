import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

// Import the server module (CommonJS) via dynamic import; Node will expose
// module.exports as the default export when required from ESM.
const appModule = await import("../index.js");
const app = appModule.default || appModule;

beforeAll(async () => {
  // Ensure services (DB, Puppeteer) are initialized. startServer supports
  // options and will skip listening when listen=false.
  if (typeof appModule.startServer === "function") {
    await appModule.startServer({ listen: false });
  }
});

afterAll(async () => {
  // Close puppeteer browser if present to avoid hanging processes
  try {
    const browser = appModule.browser;
    if (browser && typeof browser.close === "function") {
      await browser.close();
    }
  } catch (e) {
    // ignore
  }
});

describe("POST /api/export/book", () => {
  // PDF generation and Puppeteer can take longer; allow a longer timeout (90s)
  it("returns a PDF buffer with expected poem text", async () => {
    console.time("export-request-duration");
    const res = await request(app)
      .post("/api/export/book")
      .set("Accept", "application/pdf")
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .send();

    try {
      expect(res.status).toBe(200);
    } catch (err) {
      console.error(
        "Export response status:",
        res.status,
        "body length:",
        res.body && res.body.length
      );
      throw err;
    }
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);

    const buffer = res.body;
    // Magic bytes
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");

    // Write buffer to a unique OS temp directory and call the extraction
    // script to avoid importing pdf-parse directly (which can run debug code
    // in some packages). Use mkdtemp to avoid collisions in concurrent runs.
    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "aetherpress-")
    );
    const tmpPath = path.join(tmpDir, "export.pdf");
    await fs.promises.writeFile(tmpPath, buffer);
    const extractorPath = path.resolve(
      process.cwd(),
      "scripts",
      "extract-pdf-text.js"
    );
    const { stdout } = await execFileAsync(
      process.execPath,
      [extractorPath, tmpPath],
      { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
    );
    // Expect the extractor to print a PAGE_COUNT header and include expected text
    const pageCountMatch = stdout.match(/^PAGE_COUNT:\s*(\d+)/m);
    if (pageCountMatch) {
      const pageCount = Number(pageCountMatch[1]);
      // This ebook sample should have multiple pages; assert at least 2.
      expect(pageCount).toBeGreaterThanOrEqual(2);
    }
    expect(stdout).toContain("A Summer Day");
    // cleanup temporary directory
    await fs.promises
      .rm(tmpDir, { recursive: true, force: true })
      .catch(() => {});
    console.timeEnd("export-request-duration");
  }, 90000);
});
