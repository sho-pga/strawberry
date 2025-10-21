const fs = require("fs");
const path = require("path");

/**
 * Utility functions for screenshot automation
 */
module.exports = {
  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Path to directory
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  /**
   * Execute a sequence of actions on a page
   * @param {Page} page - Puppeteer page object
   * @param {Array} actions - Array of actions to execute
   */
  async executeActions(page, actions) {
    if (!Array.isArray(actions)) return;

    for (const action of actions) {
      switch (action.type) {
        case "type":
          await page.type(action.selector, action.text);
          break;
        case "click":
          await page.click(action.selector);
          break;
        case "evaluate":
          await page.evaluate(action.script);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    }
  },

  /**
   * Wait for multiple selectors to be present
   * @param {Page} page - Puppeteer page object
   * @param {Array} selectors - Array of selectors to wait for
   */
  async waitForSelectors(page, selectors) {
    if (!Array.isArray(selectors)) return;

    await Promise.all(
      selectors.map((selector) =>
        page
          .waitForSelector(selector)
          .catch((e) => console.warn(`Warning: Selector ${selector} not found`))
      )
    );
  },

  /**
   * Capture a screenshot with retry mechanism
   * @param {Page} page - Puppeteer page object
   * @param {string} filePath - Path to save screenshot
   * @param {Object} options - Screenshot options
   */
  async captureScreenshot(page, filePath, options = {}) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const screenshotOptions = {
          path: filePath,
          fullPage: true,
        };
        // puppeteer supports `quality` only for jpeg
        if (options.quality && /jpe?g/i.test(path.extname(filePath))) {
          screenshotOptions.quality = options.quality;
        }
        await page.screenshot(screenshotOptions);
        console.log(`Screenshot saved: ${filePath}`);
        return;
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  },

  /**
   * Format filename with timestamp
   * @param {string} baseName - Base filename
   * @param {string} format - File format
   * @returns {string} Formatted filename
   */
  formatFilename(baseName, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${baseName}_${timestamp}.${format}`;
  },

  /**
   * Log progress to console with formatting
   * @param {string} message - Message to log
   * @param {string} type - Type of message (info, success, error)
   */
  logProgress(message, type = "info") {
    const colors = {
      info: "\x1b[36m", // Cyan
      success: "\x1b[32m", // Green
      error: "\x1b[31m", // Red
      reset: "\x1b[0m",
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  },
};
