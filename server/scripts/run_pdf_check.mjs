#!/usr/bin/env node
import fs from "fs";
import path from "path";

const pdfPath = process.argv[2] || "/tmp/tmp.FHeLUYHCmh/ebook.pdf";

try {
  const mod = await import("../pdfQuality.mjs");
  const check = mod.default || mod.checkPdfQuality;
  const buf = fs.readFileSync(pdfPath);
  const res = await check(buf, { minBytesPerPage: 10000 });
  console.log(JSON.stringify(res, null, 2));
} catch (err) {
  console.error(
    "ERROR running pdfQuality:",
    err && err.stack ? err.stack : err
  );
  process.exit(1);
}
