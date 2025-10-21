/* Demo export script
   - Reads samples/poems.json
   - Uses server previewTemplate to create per-poem HTML pages
   - Attempts to use Puppeteer if available (CHROME_PATH/devcontainer); otherwise writes samples/summer_demo.html
   - Produces samples/summer_demo.pdf when Puppeteer available
*/
const fs = require("fs");
const path = require("path");

// demo_export.js path fix
const poemsPath = path.resolve(__dirname, "../../samples/poems.json");
const outPdf = path.resolve(__dirname, "../../samples/summer_demo.pdf");
const outHtml = path.resolve(__dirname, "../../samples/summer_demo.html");

async function main() {
  if (!fs.existsSync(poemsPath)) {
    console.error("samples/poems.json not found.");
    process.exit(1);
  }

  const poems = JSON.parse(fs.readFileSync(poemsPath, "utf8"));

  // Try to get previewTemplate from server if available
  let previewTemplate = (content) =>
    `\n<div class="preview">\n  <h1>${content.title}</h1>\n  <div class="content">${content.body}</div>\n</div>\n`;
  try {
    const server = require("../../server/index.js");
    if (server && server.previewTemplate)
      previewTemplate = server.previewTemplate;
  } catch (e) {
    // ignore - use local template
  }

  // Build multi-page HTML: each poem wrapped in a page container with simple background
  const pagesHtml = poems
    .map(
      (p) =>
        `\n<section class="page">\n  <div class="bg"></div>\n  ${previewTemplate(
          p
        )}\n</section>\n`
    )
    .join("\n");

  const fullHtml = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Summer Poems Demo</title>\n<style>\n  @page { size: A4; margin: 20mm; }\n  body { font-family: system-ui, Arial, sans-serif; }\n  .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; overflow: hidden; }\n  .bg { position: absolute; inset: 0; background: linear-gradient(135deg, #fff7e6, #e6f7ff); opacity: 0.9; }
  .preview { position: relative; z-index: 2; padding: 32mm; max-width: 150mm; margin: 0 auto; }
  .preview h1 { font-size: 28px; margin-bottom: 12px; }
  .preview .content { font-size: 18px; line-height: 1.6; }
</style>\n</head>\n<body>\n${pagesHtml}\n</body>\n</html>`;

  // Try to use puppeteer-core if available and CHROME_PATH exists
  let puppeteer;
  try {
    puppeteer = require("puppeteer-core");
  } catch (e) {
    try {
      puppeteer = require("puppeteer");
    } catch (e2) {
      puppeteer = null;
    }
  }

  if (puppeteer && process.env.CHROME_PATH) {
    console.log(
      "Puppeteer found and CHROME_PATH present. Attempting PDF generation..."
    );
    (async () => {
      let browser = null;
      try {
        browser = await puppeteer.launch({
          executablePath: process.env.CHROME_PATH,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: "networkidle0" });
        await page.pdf({ path: outPdf, format: "A4", printBackground: true });
        console.log("PDF written to", outPdf);
      } catch (err) {
        console.error(
          "Puppeteer PDF generation failed:",
          err && err.message ? err.message : err
        );
        fs.writeFileSync(outHtml, fullHtml);
        console.log("Wrote HTML fallback to", outHtml);
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch (e) {}
        }
      }
    })();
  } else {
    fs.writeFileSync(outHtml, fullHtml);
    console.log(
      "Puppeteer not available or CHROME_PATH missing. Wrote HTML fallback to",
      outHtml
    );
    console.log(
      "To generate PDF, run this script inside the devcontainer where CHROME_PATH is set."
    );
  }
}

main();
