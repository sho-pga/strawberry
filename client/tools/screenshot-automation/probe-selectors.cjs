const puppeteer = require("puppeteer-core");
const config = require("./screenshot-config.cjs");

(async () => {
  console.log(`Probing ${config.baseUrl} for selectors...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  });
  const page = await browser.newPage();
  try {
    await page.goto(config.baseUrl, {
      waitUntil: "networkidle2",
      timeout: 10000,
    });

    const selectorsToCheck = [
      config.selectors.promptInput,
      config.selectors.generateButton,
      config.selectors.exportButton,
      config.selectors.previewWindow,
      config.selectors.statusDisplay,
      config.selectors.smokeTestButton,
      config.selectors.overrideControls,
    ];

    for (const sel of selectorsToCheck) {
      try {
        const el = await page.$(sel);
        console.log(sel, el ? "FOUND" : "MISSING");
      } catch (err) {
        console.log(sel, "ERROR", err.message);
      }
    }
  } catch (err) {
    console.error("Probe failed:", err.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
