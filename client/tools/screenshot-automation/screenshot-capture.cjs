const puppeteer = require("puppeteer-core");
const path = require("path");
const config = require("./screenshot-config.cjs");
const utils = require("./screenshot-utils.cjs");

/**
 * Main screenshot automation script
 */
async function captureScreenshots() {
  // Ensure output directory exists
  const outputDir = path.resolve(__dirname, config.output.directory);
  utils.ensureDirectoryExists(outputDir);

  // Launch browser
  utils.logProgress("Launching browser...", "info");
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: config.viewport,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });

  try {
    const page = await browser.newPage();

    // Navigate to application
    utils.logProgress(`Navigating to ${config.baseUrl}`, "info");
    await page.goto(config.baseUrl);

    // Process each state
    for (const [stateName, stateConfig] of Object.entries(config.states)) {
      utils.logProgress(`Capturing state: ${stateName}`, "info");

      try {
        // Execute actions if any
        if (stateConfig.actions) {
          await utils.executeActions(page, stateConfig.actions);
        }

        // Wait for required elements
        if (stateConfig.waitFor) {
          await utils.waitForSelectors(page, stateConfig.waitFor);
        }

        // Additional delay if specified
        if (stateConfig.delay) {
          await page.waitForTimeout(stateConfig.delay);
        }

        // Capture screenshot
        const fileName = utils.formatFilename(
          stateConfig.name,
          config.output.format
        );
        const filePath = path.join(outputDir, fileName);

        await utils.captureScreenshot(page, filePath, {
          quality: config.output.quality,
        });

        utils.logProgress(`Captured ${stateName}`, "success");
      } catch (error) {
        utils.logProgress(
          `Failed to capture ${stateName}: ${error.message}`,
          "error"
        );
      }
    }
  } finally {
    await browser.close();
    utils.logProgress("Screenshot capture complete", "success");
  }
}

// Run the script
if (require.main === module) {
  captureScreenshots().catch((error) => {
    utils.logProgress(`Script failed: ${error.message}`, "error");
    process.exit(1);
  });
}

module.exports = captureScreenshots;
