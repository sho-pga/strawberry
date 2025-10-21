#!/usr/bin/env node
/**
 * Server health checks including Puppeteer functionality
 * Uses already installed puppeteer-core from server's dependencies
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

class ServerHealthCheck {
  constructor(options = {}) {
    this.chromePath =
      options.chromePath ||
      process.env.CHROME_PATH ||
      "/usr/bin/google-chrome-stable";
    this.outputDir = options.outputDir || path.join(__dirname, "../samples");
    this.timeoutMs = options.timeoutMs || 30000;
    this.browser = null;
  }

  async initialize() {
    if (!fs.existsSync(this.chromePath)) {
      throw new Error(`Chrome binary not found at ${this.chromePath}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      executablePath: this.chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async runBasicTest() {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const testFile = path.join(this.outputDir, "health_check.pdf");
    const page = await this.browser.newPage();

    try {
      await page.setContent(`
        <html>
          <body>
            <h1>Server Health Check</h1>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Status: OK</p>
          </body>
        </html>
      `);

      await page.pdf({ path: testFile, format: "A4" });
      await page.close();

      return {
        status: "ok",
        message: "Basic PDF generation successful",
        outputFile: testFile,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async checkPreviewEndpoint(url = "http://localhost:3000/preview") {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const page = await this.browser.newPage();
    const testFile = path.join(this.outputDir, "preview_check.pdf");

    try {
      const content = {
        title: "Health Check",
        body: "Preview endpoint test.",
      };

      const encodedContent = Buffer.from(JSON.stringify(content)).toString(
        "base64"
      );
      await page.goto(`${url}?content=${encodedContent}`, {
        waitUntil: "networkidle0",
        timeout: this.timeoutMs,
      });

      await page.pdf({ path: testFile, format: "A4" });
      await page.close();

      return {
        status: "ok",
        message: "Preview endpoint check successful",
        outputFile: testFile,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }
}

// CLI support
if (require.main === module) {
  (async () => {
    const checker = new ServerHealthCheck();
    try {
      await checker.initialize();
      console.log("✓ Chrome initialization successful");

      const basicResult = await checker.runBasicTest();
      console.log(`✓ Basic test: ${basicResult.message}`);

      const previewResult = await checker.checkPreviewEndpoint();
      console.log(`✓ Preview test: ${previewResult.message}`);

      console.log("All server health checks passed");
      process.exit(0);
    } catch (error) {
      console.error("✗ Health check failed:", error.message);
      process.exit(1);
    } finally {
      await checker.cleanup();
    }
  })();
}

module.exports = ServerHealthCheck;
