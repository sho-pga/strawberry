const fs = require("fs");
const path = require("path");

function bufferIndexOf(haystack, needle, start = 0) {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function extractImages(pdfPath, outDir) {
  const data = fs.readFileSync(pdfPath);
  const text = data.toString("latin1");
  const images = [];
  // Find object headers that contain /Subtype /Image
  const objRe = /\n(\d+)\s+\d+\s+obj[\s\S]*?endobj\n/gm;
  let m;
  while ((m = objRe.exec(text)) !== null) {
    const objText = m[0];
    if (!/\/Subtype\s+\/Image/.test(objText)) continue;
    // compute byte offsets to locate stream
    const objStart = m.index + 1; // because regex matched leading newline
    const streamIdx = bufferIndexOf(data, Buffer.from("\nstream\n"));
    // Better: find 'stream' within this object's slice
    const sliceStart = objStart;
    const sliceEnd = objStart + Buffer.from(objText, "latin1").length;
    const objSlice = data.slice(sliceStart, sliceEnd);
    const streamPos = bufferIndexOf(objSlice, Buffer.from("\nstream\n"));
    if (streamPos === -1) {
      continue;
    }
    const streamStart = sliceStart + streamPos + "\nstream\n".length;
    // find endstream
    const endPos = bufferIndexOf(data, Buffer.from("\nendstream"));
    // find endstream within slice
    const endPosSlice = bufferIndexOf(objSlice, Buffer.from("\nendstream"));
    if (endPosSlice === -1) continue;
    const streamEnd = sliceStart + endPosSlice;
    const streamBuf = data.slice(streamStart, streamEnd);

    images.push({ streamBuf, objIndex: images.length + 1 });
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  images.forEach((img, i) => {
    const b = img.streamBuf;
    let ext = ".bin";
    if (
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47
    )
      ext = ".png";
    else if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
      ext = ".jpg";
    const outPath = path.join(outDir, `image-${i + 1}${ext}`);
    fs.writeFileSync(outPath, b);
    console.log(`Wrote ${outPath} (${b.length} bytes) - guessed ${ext}`);
  });
  if (images.length === 0)
    console.log("No image XObject streams found by simple parser.");
}

if (require.main === module) {
  const pdfPath =
    process.argv[2] ||
    path.resolve(__dirname, "..", "tmp-exports", "last-export.pdf");
  const outDir =
    process.argv[3] || path.resolve(__dirname, "..", "tmp-exports", "images");
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found:", pdfPath);
    process.exit(2);
  }
  extractImages(pdfPath, outDir);
}
