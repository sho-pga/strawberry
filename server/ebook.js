const fs = require("fs");
const path = require("path");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br/>");
}

function loadBackgroundSvg(name) {
  try {
    const p = path.resolve(__dirname, "samples", "images", name);
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    return null;
  }
}

function generateEbookHTML(poems) {
  // Basic A4 (210mm x 297mm) styling. We set page size via puppeteer page.pdf options.
  const pages = poems
    .map((poem) => {
      const bgSvg = poem.background ? loadBackgroundSvg(poem.background) : null;
      const bg = bgSvg ? `<div class="bg">${bgSvg}</div>` : "";

      return `
      <div class="page">
        ${bg}
        <div class="content">
          <h1>${escapeHtml(poem.title || "")}</h1>
          <h2>${escapeHtml(poem.author || "")}</h2>
          <div class="poem">${escapeHtml(poem.content)}</div>
        </div>
      </div>`;
    })
    .join("\n");

  // Prefer local fonts.css if it exists
  let localFontsCss = "";
  try {
    const fontsPath = path.resolve(__dirname, "assets", "fonts", "fonts.css");
    if (fs.existsSync(fontsPath)) {
      localFontsCss = fs.readFileSync(fontsPath, "utf8");
    }
  } catch (e) {
    // ignore
  }

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      ${localFontsCss}
      @page { size: A4; margin: 20mm }
      html,body { height:100%; margin:0; padding:0; }
      .page { position: relative; width: 210mm; height: 297mm; box-sizing: border-box; page-break-after: always; overflow: hidden; }
      .bg { position:absolute; inset:0; width:100%; height:100%; }
      .bg svg { width:100%; height:100%; }
      .content { position: relative; z-index: 2; padding: 28mm 20mm; display:flex; flex-direction:column; justify-content:center; height:100%; font-family: 'Libre Baskerville', 'Times New Roman', serif; color:#0b1220 }
      .content h1 { font-size: 28pt; margin:0 0 8pt 0 }
      .content h2 { font-size: 12pt; color: #334155; margin:0 0 20pt 0 }
      .poem { font-size: 14pt; line-height: 1.5; white-space: pre-wrap }
    </style>
  </head>
  <body>
    ${pages}
  </body>
  </html>`;
}

const { validatePdfBuffer } = require("./pdfGenerator");

async function renderBookToPDF(poems, browser) {
  if (!browser) throw new Error("Browser instance required");
  const page = await browser.newPage();
  try {
    const html = generateEbookHTML(poems);
    // Use an explicit base URL so relative asset paths (eg. /images/...) resolve
    // when rendering HTML passed via setContent. Allow overriding via
    // EXPORT_BASE_URL env var for CI/dev environments.
    const EXPORT_BASE_URL =
      process.env.EXPORT_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    await page.setContent(html, {
      waitUntil: "networkidle2",
      timeout: 60000,
      url: EXPORT_BASE_URL,
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true });

    // Run lightweight validation and log results (non-fatal)
    try {
      const validation = await validatePdfBuffer(pdf);
      if (
        !validation.ok ||
        (validation.warnings && validation.warnings.length)
      ) {
        console.warn("PDF validation results:", validation);
      }
    } catch (e) {
      console.warn("PDF validation failed:", e && e.message);
    }

    return pdf;
  } finally {
    await page.close();
  }
}

module.exports = { generateEbookHTML, renderBookToPDF };
