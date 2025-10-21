import fs from "fs";
import path from "path";

test("PDF quality: page size approximates A4 and page count >= 1", async () => {
  const { startServer } = await import("../index.js");
  await startServer({ listen: false });

  const { renderBookToPDF } = await import("../ebook.js");
  const browser = module.exports.browser;
  if (!browser) {
    console.warn("Browser instance not available; skipping PDF quality test");
    return;
  }

  const samplePath = path.resolve(__dirname, "..", "samples", "poems.json");
  const raw = fs.readFileSync(samplePath, "utf8");
  const parsed = JSON.parse(raw);
  const poems = parsed && parsed.poems ? parsed.poems : parsed;

  const pdfBuffer = await renderBookToPDF(poems, browser);
  expect(pdfBuffer.length).toBeGreaterThan(1000);

  // Save to temp file
  const outFile = path.join("/tmp", `pdf_quality_${Date.now()}.pdf`);
  fs.writeFileSync(outFile, pdfBuffer);

  // Use pdfjs to inspect page size and count
  const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = pdfjsModule && (pdfjsModule.default || pdfjsModule);
  const data = new Uint8Array(fs.readFileSync(outFile));
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  // Assert page count
  expect(doc.numPages).toBeGreaterThanOrEqual(1);

  // Check first page viewport approximates A4 in points (595.28 x 841.89)
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const width = viewport.width;
  const height = viewport.height;

  const A4_WIDTH_PT = 595.28;
  const A4_HEIGHT_PT = 841.89;
  const TOLERANCE = 8; // points

  expect(Math.abs(width - A4_WIDTH_PT)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(height - A4_HEIGHT_PT)).toBeLessThanOrEqual(TOLERANCE);
});
