#!/usr/bin/env node
import fs from "fs";
import path from "path";

const pdfPath = process.argv[2] || "/tmp/tmp.FHeLUYHCmh/ebook.pdf";
try {
  // Try package import first
  let pdfjs = null;
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    console.log("Imported pdfjs-dist/legacy/build/pdf.mjs via package import");
  } catch (e) {
    try {
      const pkgPath = new URL(
        "../node_modules/pdfjs-dist/legacy/build/pdf.mjs",
        import.meta.url
      ).href;
      pdfjs = await import(pkgPath);
      console.log("Imported pdfjs from direct file path:", pkgPath);
    } catch (e2) {
      console.error("Failed to import pdfjs via package or file path");
      console.error(e2 && e2.stack ? e2.stack : e2);
      process.exit(1);
    }
  }

  const buf = fs.readFileSync(pdfPath);
  try {
    const loadingTask = pdfjs.getDocument({ data: buf });
    const doc = await loadingTask.promise;
    console.log("Loaded document; numPages=", doc.numPages);
    const page = await doc.getPage(1);
    console.log("Got page 1; viewport=", page.getViewport({ scale: 1 }));
    await doc.destroy?.();
  } catch (err) {
    console.error("Error during pdfjs getDocument/getPage:");
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
  process.exit(0);
} catch (err) {
  console.error(
    "Unexpected error in diag:",
    err && err.stack ? err.stack : err
  );
  process.exit(1);
}
