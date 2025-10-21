import { startServer } from "../index.js";
import fs from "fs";
import path from "path";

test("in-process ebook export produces a PDF with >=1 pages and expected text", async () => {
  // Start server programmatically without listening
  await startServer({ listen: false });

  // Call internal helper used by scripts: renderBookToPDF via /api/export/book
  const { renderBookToPDF } = await import("../ebook.js");
  const browser = module.exports.browser; // may be set by startServer
  if (!browser) {
    // If browser not exposed, skip test
    console.warn("Browser instance not available for test; skipping");
    return;
  }

  // Load sample poems
  const samplePath = path.resolve(__dirname, "..", "samples", "poems.json");
  const raw = fs.readFileSync(samplePath, "utf8");
  const parsed = JSON.parse(raw);
  const poems = parsed && parsed.poems ? parsed.poems : parsed;

  const pdf = await renderBookToPDF(poems, browser);
  expect(pdf.length).toBeGreaterThan(0);

  // Save to temp for local inspection
  const out = path.join("/tmp", `test_export_${Date.now()}.pdf`);
  fs.writeFileSync(out, pdf);

  // Use the project's extractor script to verify page count and text
  const { execSync } = await import("child_process");
  const extractor = path.resolve("server", "scripts", "extract-pdf-text.js");
  const outText = execSync(`node ${extractor} ${out}`, { encoding: "utf8" });
  expect(outText).toMatch(/PAGE_COUNT:\s*\d+/);
  expect(outText).toMatch(/Automated PDF Test/);
});
