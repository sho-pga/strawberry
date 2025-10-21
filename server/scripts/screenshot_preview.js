const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { rewriteDemoImages } = require("../utils/imageRewrite");

(async () => {
  try {
    const chromePath =
      process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const demoBody =
      '<div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer1.svg);background-size:cover;background-position:center;"><h1>Summer Poem 1</h1><p>By Unknown</p><pre>Roses are red\nViolets are blue\nSummer breeze carries you</pre></div><div style="page-break-after:always;padding:48px;background-image:url(/samples/images/summer2.svg);background-size:cover;background-position:center;"><h1>Summer Poem 2</h1><p>By Unknown</p><pre>Sun on the sand\nWaves lap the shore\nA page on each</pre></div>';
    const html = `<!doctype html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:0}</style></head><body>${demoBody}</body></html>`;

    const htmlToRender = rewriteDemoImages(html, { inlineSvg: true });
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(htmlToRender, {
      waitUntil: "networkidle2",
      timeout: 60000,
      url: "http://localhost:3000",
    });

    const outDir = path.resolve(__dirname, "..", "client", "test-artifacts");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `preview-screenshot-${Date.now()}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log("Saved screenshot to", out);
    await browser.close();
  } catch (e) {
    console.error("Screenshot script failed:", e && e.message);
    process.exit(2);
  }
})();
