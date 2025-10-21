const { chromium } = require('playwright');
const fs = require('fs');

async function runVerifier() {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  console.log('Visiting', base);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set up console and error listeners for the page
  page.on('console', (msg) => console.log('PAGE console:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE error:', err.message));
  page.on('requestfailed', (req) => console.log('REQUEST failed:', req.url(), req.failure && req.failure().errorText));
  page.on('response', (res) => {
    if (res.url().endsWith('/preview') || res.url().includes('/api/preview')) {
      console.log('PREVIEW response', res.status(), res.url());
    }
  });

  try {
    // Navigate to the base URL and wait for network to be idle
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('body');

    // Check for the presence of a dev UI state element
    const devState = await page.$('.dev-ui-state');
    console.log('DEV UI STATE element present?', !!devState);

    // Find and click the "Load demo" button
    const demoBtn = await page.$("button[data-testid='load-demo']");
    if (!demoBtn) {
      console.error('Load demo button not found');
      await takeScreenshotAndExit(page, browser, 'verify-preview-no-demo-button.png', 2);
    }
    await demoBtn.click();
    console.log('Clicked Load V0.1 demo');

    // Snapshot the HTML of the preview container if present
    const previewContainer = await page.$('.preview-container');
    if (previewContainer) {
      const htmlDump = await previewContainer.innerHTML();
      console.log('Preview container HTML snapshot:', htmlDump.slice(0, 800));
    } else {
      console.log('Preview container not found in DOM');
    }

    // Check for skeleton and spinner elements
    const skeleton = await page.waitForSelector('.skeleton', { timeout: 2000 }).catch(() => null);
    console.log('Skeleton present after click?', !!skeleton);

    const spinner = (await page.$('.center-spinner .spinner')) || (await page.$('.loading .spinner')) || (await page.$('.btn-spinner'));
    console.log('Spinner element found?', !!spinner);

    // Check for global preview update markers
    const previewTs = await page.evaluate(() => window.__preview_updated_ts || null).catch(() => null);
    const previewSnippet = await page.evaluate(() => window.__preview_html_snippet || null).catch(() => null);
    const attrMarker = await page.$('.preview-container[data-preview-updated]');
    console.log('Global preview timestamp marker?', !!previewTs, 'attr marker?', !!attrMarker);

    // Wait for the preview content to appear or check for specific text
    const preview = await page.waitForSelector('[data-testid="preview-content"]', { timeout: 7000 }).catch(() => null);
    if (preview) {
      const html = await preview.innerHTML();
      console.log('Preview content length:', html.length);
    } else {
      const foundText = await page.waitForFunction(() => document.body.innerText.includes('Summer Poem 1'), { timeout: 7000 }).catch(() => null);
      if (foundText) {
        const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
        console.log('Found demo text in page body; snippet:', bodyText);
      } else {
        console.error('Preview content did not appear within timeout (no testid and demo text missing)');
        await takeScreenshotAndExit(page, browser, 'verify-preview-failure.png', 3);
      }
    }

    // Verify skeleton is gone after content loads
    const skeletonGone = !(await page.$('.skeleton'));
    console.log('Skeleton gone after content?', skeletonGone);

    console.log('Verification PASSED');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Verification ERROR', err && err.stack ? err.stack : err);
    await takeScreenshotAndExit(page, browser, 'verify-preview-exception.png', 4);
  }
}

// Helper function to take screenshot and exit
async function takeScreenshotAndExit(page, browser, filename, exitCode) {
  try {
    fs.mkdirSync('/workspaces/Aether/client/tmp', { recursive: true });
  } catch (e) {
    console.error('Failed to create screenshot directory:', e);
  }
  await page.screenshot({ path: `/workspaces/Aether/client/tmp/${filename}` }).catch((e) => console.error('Failed to take screenshot:', e));
  await browser.close();
  process.exit(exitCode);
}

runVerifier();