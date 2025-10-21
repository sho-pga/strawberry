const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

async function inspect(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  console.log(`PDF loaded: pages=${doc.numPages}`);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    const fnArray = ops.fnArray;
    const argsArray = ops.argsArray;
    let imagesFound = 0;
    for (let j = 0; j < fnArray.length; j++) {
      const fnId = fnArray[j];
      const args = argsArray[j];
      // Operator id 84 is paintImageXObject, 85 paintImageXObjectRepeat
      if (fnId === 84 || fnId === 85) {
        imagesFound++;
      }
    }
    console.log(`page ${i}: found ${imagesFound} image paint ops`);
  }
}

if (require.main === module) {
  const pdfPath =
    process.argv[2] ||
    path.resolve(__dirname, "..", "tmp-exports", "last-export.pdf");
  inspect(pdfPath).catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
